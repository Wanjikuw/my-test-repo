import type { FastifyBaseLogger, FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { Capabilities, ModelNote, NotesResponse, OcrResponse } from '@allergy-checker/shared';
import {
  describeNames,
  readLabelImage,
  resolveQwenConfig,
  UpstreamError,
  type QwenConfig,
  type RawNote,
} from '../assist/qwen';
import { lookup } from '../matching/matcher';
import { normaliseInciName } from '../matching/normalise';
import { MAX_NAME_CHARS } from './analyze';
import { loadContextLazily, parseOrThrow, type LoadContext } from './support';

/** A phone photo downscaled to 1600 px as JPEG is well under a megabyte; this is the ceiling. */
export const MAX_IMAGE_DATA_URL_CHARS = 6_000_000;
/** A label's median is ten unrecognised names; this covers the long tail in one call. */
export const MAX_NOTE_NAMES = 25;
const NOTE_CACHE_SIZE = 2_000;

const OcrBody = z
  .object({
    image: z
      .string()
      .max(MAX_IMAGE_DATA_URL_CHARS)
      .regex(
        /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
        'image must be a base64 JPEG, PNG or WebP data URL.',
      ),
  })
  .strict();

const NotesBody = z
  .object({
    names: z.array(z.string().trim().min(1).max(MAX_NAME_CHARS)).min(1).max(MAX_NOTE_NAMES),
  })
  .strict();

/**
 * Bounded and least-recently-used. `Map` iterates in insertion order, so re-inserting on
 * read keeps the oldest entry first, where eviction takes it.
 */
class LruCache<K, V> {
  private readonly entries = new Map<K, V>();

  constructor(private readonly capacity: number) {}

  get(key: K): V | undefined {
    const value = this.entries.get(key);
    if (value !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }
  }
}

function notConfigured(reply: FastifyReply, what: string) {
  return reply.code(503).send({ error: `${what} is not configured on this server.` });
}

function upstreamFailed(reply: FastifyReply, log: FastifyBaseLogger, error: UpstreamError) {
  log.warn({ err: error }, 'qwen call failed');
  return reply.code(error.exhausted ? 503 : 502).send({ error: error.message });
}

export interface AssistRouteOptions {
  loadContext?: LoadContext | undefined;
  /** Undefined reads the environment; null switches the model-assisted routes off. */
  qwen?: QwenConfig | null | undefined;
  fetch?: typeof fetch | undefined;
}

export async function assistRoutes(app: FastifyInstance, options: AssistRouteOptions = {}) {
  const loadContext = options.loadContext ?? loadContextLazily;
  const qwen = options.qwen === undefined ? resolveQwenConfig() : options.qwen;
  const fetchImpl = options.fetch ?? fetch;
  // Unrecognised names recur across labels, and a note on a substance does not change
  // between requests. Keyed by the matcher's normal form, so case and spacing share one.
  const notes = new LruCache<string, RawNote>(NOTE_CACHE_SIZE);

  app.get('/capabilities', async (): Promise<Capabilities> => ({
    remoteOcr: qwen ? { model: qwen.ocrModel } : null,
    modelNotes: qwen ? { model: qwen.textModel } : null,
  }));

  app.post(
    '/ocr',
    {
      bodyLimit: MAX_IMAGE_DATA_URL_CHARS + 1_024,
      // Each call is a paid or quota-bound vision request, so it gets its own, lower budget.
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      if (!qwen) return notConfigured(reply, 'Remote OCR');
      const { image } = parseOrThrow(OcrBody, request.body);

      try {
        const text = await readLabelImage(qwen, image, fetchImpl);
        return { text, model: qwen.ocrModel } satisfies OcrResponse;
      } catch (error) {
        if (error instanceof UpstreamError) return upstreamFailed(reply, request.log, error);
        throw error;
      }
    },
  );

  app.post(
    '/notes',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      if (!qwen) return notConfigured(reply, 'Model notes');
      const { names } = parseOrThrow(NotesBody, request.body);

      const byKey = new Map<string, string>();
      for (const name of names) {
        const key = normaliseInciName(name);
        if (!byKey.has(key)) byKey.set(key, name);
      }

      const missing = [...byKey].filter(([key]) => notes.get(key) === undefined);
      if (missing.length > 0) {
        let fresh: RawNote[];
        try {
          fresh = await describeNames(
            qwen,
            missing.map(([, name]) => name),
            fetchImpl,
          );
        } catch (error) {
          if (error instanceof UpstreamError) return upstreamFailed(reply, request.log, error);
          throw error;
        }
        // Only names that were asked about are cached. The cache is shared between users,
        // and a crafted name must not be able to plant a note under somebody else's.
        const asked = new Set(missing.map(([key]) => key));
        for (const note of fresh) {
          const key = normaliseInciName(note.name);
          if (asked.has(key)) notes.set(key, note);
        }
      }

      const context = await loadContext();
      const answered = [...byKey].flatMap(([key, rawText]): ModelNote[] => {
        const note = notes.get(key);
        if (!note) return [];
        const resolved = note.inci ? lookup(context.index, note.inci) : undefined;
        return [
          {
            rawText,
            proposedInciName: note.inci,
            summary: note.summary,
            confidence: note.confidence,
            resolvesTo: resolved
              ? { id: resolved.record.id, inciName: resolved.record.inciName }
              : null,
          },
        ];
      });

      return { notes: answered, model: qwen.textModel } satisfies NotesResponse;
    },
  );
}
