import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  coverageOf,
  score,
  SkinType,
  SunExposure,
  type AnalyzeResponse,
  type MatchedIngredient,
} from '@allergy-checker/shared';
import type { MatchingContext } from '../matching/context';
import { analyseNames, type LabelAnalysis } from '../matching/matcher';
import { parseIngredientList } from '../matching/normalise';
import { badRequest, loadContextLazily, parseOrThrow, type LoadContext } from './support';

/**
 * A densely printed cosmetic label runs to a few thousand characters. The ceiling is far
 * above that but still finite: fuzzy suggestion cost scales with the number of
 * unrecognised names, so an unbounded list is a way to spend our CPU on someone else's
 * behalf.
 */
export const MAX_LABEL_CHARS = 20_000;
export const MAX_NAMES = 400;
export const MAX_NAME_CHARS = 200;
export const MAX_DECLARED_ALLERGIES = 200;

const name = z.string().trim().min(1).max(MAX_NAME_CHARS);

/**
 * `strict` matters more than it looks. A misspelled `skinTypes` would otherwise be
 * dropped in silence and the caller would receive a confident verdict computed for no
 * skin type at all, with nothing in the response to say so.
 */
const AnalyzeBody = z
  .object({
    label: z.string().trim().min(1).max(MAX_LABEL_CHARS).optional(),
    inciNames: z.array(name).min(1).max(MAX_NAMES).optional(),
    skinType: SkinType.nullish(),
    sunExposure: SunExposure.nullish(),
    declaredAllergies: z.array(name).max(MAX_DECLARED_ALLERGIES).default([]),
    suggestUnmatched: z.boolean().default(true),
  })
  .strict()
  .refine((body) => (body.label === undefined) !== (body.inciNames === undefined), {
    message: 'Provide exactly one of `label` or `inciNames`.',
  });

export type AnalyzeBody = z.infer<typeof AnalyzeBody>;

/**
 * Provenance and suggestions are kept out of `MatchResult` so that no fuzzy guess can
 * reach the scoring rules. They are folded back in here, where the only thing at stake is
 * how the answer is explained. Both side arrays run parallel to the lists they describe,
 * so this is a single pass with no lookups.
 */
export function buildAnalyzeResponse(
  analysis: LabelAnalysis,
  context: MatchingContext,
): AnalyzeResponse {
  const { result, provenance, unrecognised } = analysis;
  const scored = score(result);

  return {
    tier: scored.tier,
    explanations: scored.explanations,
    profile: {
      skinType: result.skinType,
      sunExposure: result.sunExposure,
      unresolvedAllergies: analysis.unresolvedAllergies,
    },
    matched: result.matches.map((match, i): MatchedIngredient => ({
      ...match,
      matchedFrom: provenance[i]?.rawText ?? match.inciName,
      strategy: provenance[i]?.strategy ?? 'exact',
      position: provenance[i]?.position ?? i,
    })),
    unmatched: unrecognised,
    coverage: coverageOf(result.matches.length, result.unmatched.length),
    corpus: {
      ingredientCount: context.records.length,
      loadedAt: context.loadedAt.toISOString(),
    },
  };
}

export interface AnalyzeRouteOptions {
  loadContext?: LoadContext;
}

export async function analyzeRoutes(app: FastifyInstance, options: AnalyzeRouteOptions = {}) {
  const loadContext = options.loadContext ?? loadContextLazily;

  app.post('/analyze', async (request): Promise<AnalyzeResponse> => {
    const body = parseOrThrow(AnalyzeBody, request.body);

    const names =
      body.label === undefined ? (body.inciNames ?? []) : parseIngredientList(body.label);

    // A label of nothing but punctuation parses to no names, and scoring an empty list
    // returns Safe. Reporting the label as safe because we could not read it is the worst
    // error this system can make, so it is refused instead.
    if (names.length === 0) {
      throw badRequest('No ingredient names could be read from `label`.');
    }
    if (names.length > MAX_NAMES) {
      throw badRequest(
        `A label may list at most ${MAX_NAMES} ingredients; this one parsed to ${names.length}.`,
      );
    }

    const context = await loadContext();
    const analysis = analyseNames(names, context.index, context.rules, {
      skinType: body.skinType ?? null,
      sunExposure: body.sunExposure ?? null,
      declaredAllergies: body.declaredAllergies,
      suggestUnmatched: body.suggestUnmatched,
    });

    return buildAnalyzeResponse(analysis, context);
  });
}
