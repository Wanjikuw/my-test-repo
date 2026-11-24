import { describe, it, expect } from 'vitest';
import { buildServer } from '../index';
import { MAX_INGREDIENT_CHARS } from './product';

function fakeObf(respond: (url: string) => Response | Promise<Response>) {
  const urls: string[] = [];
  const impl = (async (url: string | URL | Request) => {
    urls.push(String(url));
    return respond(String(url));
  }) as typeof fetch;
  return { impl, urls };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

async function server(fetchImpl: typeof fetch) {
  return buildServer({
    logger: false,
    rateLimit: false,
    auth: false,
    fetch: fetchImpl,
  });
}

describe('GET /product/:barcode', () => {
  it('returns the name, brand and ingredient text, and nothing else', async () => {
    const { impl, urls } = fakeObf(() =>
      json({
        status: 1,
        product: {
          product_name: ' Hydrating Cream ',
          brands: 'Acme',
          ingredients_text_en: 'Aqua, Glycerin, Linalool',
          ingredients_text: 'Eau, Glycérine',
          ingredients_analysis_tags: ['en:vegan'],
        },
      }),
    );
    const app = await server(impl);
    const res = await app.inject({ method: 'GET', url: '/product/3600550000000' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      barcode: '3600550000000',
      name: 'Hydrating Cream',
      brand: 'Acme',
      ingredientsText: 'Aqua, Glycerin, Linalool',
    });
    expect(urls[0]).toContain('/api/v2/product/3600550000000.json');
  });

  it('falls back to the original-language text', async () => {
    const { impl } = fakeObf(() => json({ status: 1, product: { ingredients_text: 'Eau, Sel' } }));
    const res = await (await server(impl)).inject({ method: 'GET', url: '/product/12345678' });
    expect(res.json()).toMatchObject({ ingredientsText: 'Eau, Sel', name: null, brand: null });
  });

  it('caps the length of the ingredient text', async () => {
    const { impl } = fakeObf(() =>
      json({ status: 1, product: { ingredients_text: 'a'.repeat(MAX_INGREDIENT_CHARS + 500) } }),
    );
    const res = await (await server(impl)).inject({ method: 'GET', url: '/product/12345678' });
    expect(res.json<{ ingredientsText: string }>().ingredientsText).toHaveLength(
      MAX_INGREDIENT_CHARS,
    );
  });

  it.each(['123', 'abcdefgh', '1234567890123456', '1234567x'])(
    'refuses %s without calling the upstream',
    async (barcode) => {
      const { impl, urls } = fakeObf(() => json({}));
      const res = await (await server(impl)).inject({ method: 'GET', url: `/product/${barcode}` });
      expect(res.statusCode).toBe(400);
      expect(urls).toHaveLength(0);
    },
  );

  it('says so when the product is unknown, or has no ingredients', async () => {
    const unknown = fakeObf(() => json({ status: 0 }));
    expect(
      (await (await server(unknown.impl)).inject({ method: 'GET', url: '/product/12345678' }))
        .statusCode,
    ).toBe(404);

    const bare = fakeObf(() => json({ status: 1, product: { product_name: 'X' } }));
    const res = await (await server(bare.impl)).inject({ method: 'GET', url: '/product/12345678' });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ error: string }>().error).toMatch(/without an ingredient list/);
  });

  it('reports an upstream failure as 502 without leaking detail', async () => {
    const down = fakeObf(() => json({}, 503));
    const res = await (await server(down.impl)).inject({ method: 'GET', url: '/product/12345678' });
    expect(res.statusCode).toBe(502);
    expect(res.body).not.toMatch(/503/);

    const thrown = fakeObf(() => {
      throw new Error('socket hang up');
    });
    const res2 = await (
      await server(thrown.impl)
    ).inject({
      method: 'GET',
      url: '/product/12345678',
    });
    expect(res2.statusCode).toBe(502);
  });

  it('refuses an oversized upstream answer', async () => {
    const { impl } = fakeObf(() => new Response('x'.repeat(300_000)));
    const res = await (await server(impl)).inject({ method: 'GET', url: '/product/12345678' });
    expect(res.statusCode).toBe(502);
  });

  it('needs a sign-in when auth is enforced', async () => {
    const { impl, urls } = fakeObf(() => json({}));
    const app = await buildServer({
      logger: false,
      rateLimit: false,
      fetch: impl,
      auth: async () => {
        throw new Error('not a token');
      },
    });
    const res = await app.inject({ method: 'GET', url: '/product/12345678' });
    expect(res.statusCode).toBe(401);
    expect(urls).toHaveLength(0);
  });
});
