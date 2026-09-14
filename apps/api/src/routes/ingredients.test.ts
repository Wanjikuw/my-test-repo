import { describe, it, expect, vi } from 'vitest';
import { buildServer } from '../index';
import type { MatchingContext } from '../matching/context';
import { buildIngredientIndex, type IngredientRecord } from '../matching/matcher';

const SLS_ID = '11111111-1111-4111-8111-111111111111';

// Ordered as the context guarantees: `refresh` sorts by inciName before the routes see it.
const records: IngredientRecord[] = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    inciName: 'Aqua',
    aliases: ['Water'],
    regulatoryStatus: 'none',
    sourceCitation: 'CosIng 75326',
    riskTags: [],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    inciName: 'Lauryl Glucoside',
    aliases: [],
    regulatoryStatus: 'none',
    sourceCitation: 'CosIng 56231',
    riskTags: [],
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    inciName: 'Linalool',
    aliases: [],
    regulatoryStatus: 'restricted',
    sourceCitation: 'Regulation (EC) No 1223/2009, Annex III entry 84',
    riskTags: [{ riskCategory: 'fragrance_allergen', sourceCitation: 'Annex III entry 84' }],
  },
  {
    id: SLS_ID,
    inciName: 'Sodium Lauryl Sulfate',
    aliases: ['SLS'],
    regulatoryStatus: 'none',
    sourceCitation: 'CosIng 34992',
    riskTags: [{ riskCategory: 'common_irritant', sourceCitation: 'Löffler & Effendy 1999' }],
  },
];

function corpus(): MatchingContext {
  return {
    index: buildIngredientIndex(records),
    records,
    rules: [],
    ingredientCount: records.length,
    loadedAt: new Date('2026-09-14T09:00:00.000Z'),
  };
}

async function server(loadContext = async () => corpus()) {
  return buildServer({ logger: false, rateLimit: false, loadContext });
}

describe('GET /ingredients', () => {
  it('lists the corpus in the order the context supplies', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/ingredients' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.map((i: { inciName: string }) => i.inciName)).toEqual([
      'Aqua',
      'Lauryl Glucoside',
      'Linalool',
      'Sodium Lauryl Sulfate',
    ]);
    expect(body.total).toBe(4);
  });

  it('finds an ingredient by an alias the label might print instead', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/ingredients?q=water' });

    expect(res.json().items.map((i: { inciName: string }) => i.inciName)).toEqual(['Aqua']);
  });

  // Search runs on the matcher's key space, so the fold that makes `Sulphate` matchable
  // is the same fold that makes it findable. Two spelling rules could not drift apart.
  it('finds an American spelling from a British one', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/ingredients?q=Sulphate' });

    expect(res.json().items.map((i: { inciName: string }) => i.inciName)).toEqual([
      'Sodium Lauryl Sulfate',
    ]);
  });

  it('ranks a name starting with the query above one merely containing it', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/ingredients?q=lauryl' });

    expect(res.json().items.map((i: { inciName: string }) => i.inciName)).toEqual([
      'Lauryl Glucoside',
      'Sodium Lauryl Sulfate',
    ]);
  });

  it('reports the full match count, not the size of the page', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/ingredients?limit=2&offset=2' });

    const body = res.json();
    expect(body.items.map((i: { inciName: string }) => i.inciName)).toEqual([
      'Linalool',
      'Sodium Lauryl Sulfate',
    ]);
    expect(body).toMatchObject({ total: 4, limit: 2, offset: 2 });
  });

  it('returns nothing rather than everything when the query matches nothing', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/ingredients?q=unobtainium' });

    expect(res.json()).toMatchObject({ items: [], total: 0 });
  });

  it('refuses a page size it will not serve instead of quietly shrinking it', async () => {
    const app = await server();
    const tooLarge = await app.inject({ method: 'GET', url: '/ingredients?limit=500' });
    const zero = await app.inject({ method: 'GET', url: '/ingredients?limit=0' });
    const negative = await app.inject({ method: 'GET', url: '/ingredients?offset=-1' });

    expect(tooLarge.statusCode).toBe(400);
    expect(zero.statusCode).toBe(400);
    expect(negative.statusCode).toBe(400);
  });
});

describe('GET /ingredients/:id', () => {
  it('returns the evidence behind every risk tag', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: `/ingredients/${SLS_ID}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      inciName: 'Sodium Lauryl Sulfate',
      riskCategories: ['common_irritant'],
      riskTags: [{ riskCategory: 'common_irritant', sourceCitation: 'Löffler & Effendy 1999' }],
    });
  });

  it('is a 404 for an id that is well formed but unknown', async () => {
    const app = await server();
    const res = await app.inject({
      method: 'GET',
      url: '/ingredients/99999999-9999-4999-8999-999999999999',
    });

    expect(res.statusCode).toBe(404);
  });

  it('is a 400 for an id that is not an id', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/ingredients/not-a-uuid' });

    expect(res.statusCode).toBe(400);
  });

  it('validates before loading the corpus', async () => {
    const loadContext = vi.fn(async () => corpus());
    const app = await server(loadContext);

    await app.inject({ method: 'GET', url: '/ingredients/not-a-uuid' });
    expect(loadContext).not.toHaveBeenCalled();
  });
});
