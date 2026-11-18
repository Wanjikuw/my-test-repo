import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ProductResponse } from '@allergy-checker/shared';
import { parseOrThrow } from './support';

const OBF_BASE = 'https://world.openbeautyfacts.org/api/v2/product';
const TIMEOUT_MS = 8_000;
/** A product record is a few kilobytes; this stops a misbehaving upstream filling memory. */
const MAX_BODY_CHARS = 200_000;
export const MAX_INGREDIENT_CHARS = 5_000;
const FIELDS = 'product_name,brands,ingredients_text,ingredients_text_en';

const Params = z.object({
  barcode: z.string().regex(/^\d{8,14}$/, 'A barcode is 8 to 14 digits.'),
});

export interface ProductRouteOptions {
  fetch?: typeof fetch | undefined;
}

interface ObfProduct {
  product_name?: unknown;
  brands?: unknown;
  ingredients_text?: unknown;
  ingredients_text_en?: unknown;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export async function productRoutes(app: FastifyInstance, options: ProductRouteOptions = {}) {
  const fetchImpl = options.fetch ?? fetch;

  app.get(
    '/product/:barcode',
    // Every call is a request to a free community service, so the budget is low.
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { barcode } = parseOrThrow(Params, request.params);

      let payload: { status?: unknown; product?: ObfProduct } | null;
      try {
        const response = await fetchImpl(`${OBF_BASE}/${barcode}.json?fields=${FIELDS}`, {
          headers: { 'User-Agent': 'Angalia/1.0 (ingredient checker)', Accept: 'application/json' },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.status === 404) {
          return reply.code(404).send({ error: 'No product with that barcode was found.' });
        }
        if (!response.ok) throw new Error(`upstream ${response.status}`);
        const body = await response.text();
        if (body.length > MAX_BODY_CHARS) throw new Error('upstream body too large');
        payload = JSON.parse(body) as typeof payload;
      } catch (error) {
        request.log.warn({ err: error }, 'open beauty facts lookup failed');
        return reply.code(502).send({ error: 'The product database could not be reached.' });
      }

      const product = payload?.status === 1 ? payload.product : undefined;
      if (!product) {
        return reply.code(404).send({ error: 'No product with that barcode was found.' });
      }
      const ingredients = text(product.ingredients_text_en) ?? text(product.ingredients_text);
      if (!ingredients) {
        return reply
          .code(404)
          .send({ error: 'That product is listed, but without an ingredient list.' });
      }

      return {
        barcode,
        name: text(product.product_name),
        brand: text(product.brands),
        ingredientsText: ingredients.slice(0, MAX_INGREDIENT_CHARS),
      } satisfies ProductResponse;
    },
  );
}
