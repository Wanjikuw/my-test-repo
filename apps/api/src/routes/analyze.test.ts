import { describe, it, expect, vi } from 'vitest';
import { buildServer } from '../index';
import type { MatchingContext } from '../matching/context';
import {
  buildIngredientIndex,
  type IngredientRecord,
  type SensitivityRule,
} from '../matching/matcher';
import { MAX_NAMES } from './analyze';

const records: IngredientRecord[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    inciName: 'Linalool',
    aliases: [],
    regulatoryStatus: 'restricted',
    sourceCitation: 'Regulation (EC) No 1223/2009, Annex III entry 84',
    riskTags: [{ riskCategory: 'fragrance_allergen', sourceCitation: 'Annex III entry 84' }],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    inciName: '2-(4-tert-butylbenzyl) propionaldehyde',
    aliases: ['Butylphenyl Methylpropional'],
    regulatoryStatus: 'prohibited',
    sourceCitation: 'Regulation (EC) No 1223/2009, Annex II entry 1666',
    riskTags: [],
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    inciName: 'Tagetes Minuta Flower Extract',
    aliases: [],
    regulatoryStatus: 'restricted',
    sourceCitation: 'Annex III entry 309',
    riskTags: [{ riskCategory: 'photosensitizing', sourceCitation: 'SCCS/1636/21' }],
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    inciName: 'Aqua',
    aliases: ['Water'],
    regulatoryStatus: 'none',
    sourceCitation: 'CosIng 75326',
    riskTags: [],
  },
];

const rules: SensitivityRule[] = [
  {
    skinType: 'sensitive',
    riskCategory: 'fragrance_allergen',
    interactionNote: 'Sensitive skin reacts to declarable fragrance allergens more readily.',
  },
];

function corpus(): MatchingContext {
  return {
    index: buildIngredientIndex(records),
    records,
    rules,
    ingredientCount: records.length,
    loadedAt: new Date('2026-09-14T09:00:00.000Z'),
  };
}

async function server(loadContext = async () => corpus()) {
  return buildServer({ logger: false, rateLimit: false, loadContext });
}

function analyse(app: Awaited<ReturnType<typeof server>>, payload: unknown) {
  return app.inject({ method: 'POST', url: '/analyze', payload: payload as object });
}

describe('POST /analyze', () => {
  it('reads a printed label and returns a verdict with reasons', async () => {
    const app = await server();
    const res = await analyse(app, { label: 'Aqua, Linalool', skinType: 'normal' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tier).toBe('Safe');
    expect(body.matched.map((m: { inciName: string }) => m.inciName)).toEqual(['Aqua', 'Linalool']);
    expect(body.corpus.ingredientCount).toBe(records.length);
  });

  it('accepts a list that the caller has already split', async () => {
    const app = await server();
    const res = await analyse(app, { inciNames: ['Aqua', 'Linalool'], skinType: 'normal' });

    expect(res.statusCode).toBe(200);
    expect(res.json().matched).toHaveLength(2);
  });

  // 1,2-Hexanediol is one ingredient. Splitting on every comma would shred it into two
  // fragments that can never match, and rule 7 would report both as unverified.
  it('does not split a name on a comma between digits', async () => {
    const app = await server();
    const res = await analyse(app, { label: 'Aqua, 1,2-Hexanediol' });

    expect(res.json().unmatched.map((u: { rawText: string }) => u.rawText)).toEqual([
      '1,2-Hexanediol',
    ]);
  });

  it('reports the printed text alongside the name it resolved to', async () => {
    const app = await server();
    const res = await analyse(app, { label: 'Butylphenyl Methylpropional' });

    const [match] = res.json().matched;
    expect(match.matchedFrom).toBe('Butylphenyl Methylpropional');
    expect(match.inciName).toBe('2-(4-tert-butylbenzyl) propionaldehyde');
    expect(match.strategy).toBe('exact');
  });

  it('returns Avoid for a prohibited substance whatever the profile says', async () => {
    const app = await server();
    const res = await analyse(app, { label: 'Butylphenyl Methylpropional', skinType: 'normal' });

    const body = res.json();
    expect(body.tier).toBe('Avoid');
    expect(body.explanations[0].sourceCitation).toContain('Annex II');
  });

  it('escalates a regulation-backed tag on sensitive skin', async () => {
    const app = await server();
    const normal = await analyse(app, { label: 'Linalool', skinType: 'normal' });
    const sensitive = await analyse(app, { label: 'Linalool', skinType: 'sensitive' });

    expect(normal.json().tier).toBe('Safe');
    expect(sensitive.json().tier).toBe('Avoid');
  });

  it('treats an unanswered sun-exposure question as exposure', async () => {
    const app = await server();
    const unasked = await analyse(app, { inciNames: ['Tagetes Minuta Flower Extract'] });
    const avoided = await analyse(app, {
      inciNames: ['Tagetes Minuta Flower Extract'],
      sunExposure: 'avoided',
    });

    expect(unasked.json().tier).toBe('Caution');
    expect(avoided.json().tier).toBe('Safe');
  });

  it('honours a declared allergy declared against an alias', async () => {
    const app = await server();
    const res = await analyse(app, { inciNames: ['Aqua'], declaredAllergies: ['Water'] });

    expect(res.json().tier).toBe('Avoid');
    expect(res.json().matched[0].userDeclaredAllergyMatch).toBe(true);
  });

  it('offers a near-miss for an unrecognised name without letting it change the verdict', async () => {
    const app = await server();
    const res = await analyse(app, { label: 'Linalol' });

    const body = res.json();
    expect(body.matched).toHaveLength(0);
    expect(body.tier).toBe('UnverifiedCaution');
    expect(body.unmatched[0].suggestions).toEqual([{ candidate: 'Linalool', distance: 1 }]);
  });

  it('can be asked not to spend time on suggestions', async () => {
    const app = await server();
    const res = await analyse(app, { label: 'Linalol', suggestUnmatched: false });

    expect(res.json().unmatched[0].suggestions).toEqual([]);
  });

  // Reporting a label as safe because it could not be read is the worst error available
  // to this system, so an unreadable label is refused rather than scored.
  it('refuses a label that yields no names rather than calling it Safe', async () => {
    const app = await server();
    const res = await analyse(app, { label: ',,,' });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/No ingredient names/);
  });

  it('refuses a label longer than any real one', async () => {
    const app = await server();
    const label = Array.from({ length: MAX_NAMES + 1 }, (_, i) => `Ingredient ${i}`).join(', ');
    const res = await analyse(app, { label });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/at most 400 ingredients/);
  });

  it('requires exactly one of label or inciNames', async () => {
    const app = await server();
    const both = await analyse(app, { label: 'Aqua', inciNames: ['Aqua'] });
    const neither = await analyse(app, { skinType: 'dry' });

    expect(both.statusCode).toBe(400);
    expect(neither.statusCode).toBe(400);
  });

  // A dropped `skinTypes` would produce a confident verdict computed for no profile at
  // all, with nothing in the response to show the caller that their field was ignored.
  it('rejects an unknown field instead of ignoring it', async () => {
    const app = await server();
    const res = await analyse(app, { label: 'Aqua', skinTypes: 'sensitive' });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/skinTypes/);
  });

  it('rejects a skin type outside the enum', async () => {
    const app = await server();
    const res = await analyse(app, { label: 'Aqua', skinType: 'greasy' });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/skinType/);
  });

  it('validates before loading the corpus, so a bad request costs no database read', async () => {
    const loadContext = vi.fn(async () => corpus());
    const app = await server(loadContext);

    await analyse(app, { label: 'Aqua', skinTypes: 'sensitive' });
    expect(loadContext).not.toHaveBeenCalled();

    await analyse(app, { label: 'Aqua' });
    expect(loadContext).toHaveBeenCalledTimes(1);
  });
});
