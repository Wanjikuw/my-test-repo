import { describe, expect, it } from 'vitest';
import { inferSkinType, issueNotes, SENSITIVITY_ISSUES } from './skin-quiz';

const answer = (...pairs: [string, string][]) => Object.fromEntries(pairs);

describe('inferSkinType', () => {
  it('reads a dry profile', () => {
    const r = inferSkinType(
      answer(
        ['after-wash', 'tight'],
        ['midday', 'none'],
        ['pores', 'barely'],
        ['flaking', 'often'],
      ),
    );
    expect(r.skinType).toBe('dry');
    expect(r.confidence).toBe('clear');
    expect(r.runnerUp).toBeNull();
  });

  it('reads an oily profile', () => {
    const r = inferSkinType(
      answer(['after-wash', 'shiny'], ['midday', 'all'], ['pores', 'wide'], ['flaking', 'never']),
    );
    expect(r.skinType).toBe('oily');
  });

  it('reads a combination profile', () => {
    const r = inferSkinType(
      answer(['after-wash', 'zone'], ['midday', 'zone'], ['pores', 'nose'], ['flaking', 'never']),
    );
    expect(r.skinType).toBe('combination');
  });

  it('reads a normal profile', () => {
    const r = inferSkinType(
      answer(
        ['after-wash', 'comfortable'],
        ['midday', 'none'],
        ['pores', 'barely'],
        ['flaking', 'never'],
      ),
    );
    expect(r.skinType).toBe('normal');
    expect(r.issues).toEqual([]);
  });

  it('calls a narrow lead close and offers the runner-up', () => {
    const r = inferSkinType(answer(['after-wash', 'tight'], ['midday', 'all']));
    expect(r.confidence).toBe('close');
    expect(new Set([r.skinType, r.runnerUp])).toEqual(new Set(['dry', 'oily']));
  });

  it('says nothing when nothing answered points anywhere', () => {
    for (const answers of [{}, { nonsense: 'x' }, { 'after-wash': 'nope' }]) {
      const r = inferSkinType(answers);
      expect(r.skinType).toBeNull();
      expect(r.confidence).toBe('none');
    }
  });

  it('calls skin sensitive on two reported reactions and names them', () => {
    const r = inferSkinType(
      answer(
        ['after-wash', 'tight'],
        ['flaking', 'often'],
        ['sting', 'often'],
        ['fragrance', 'often'],
      ),
    );
    expect(r.skinType).toBe('sensitive');
    expect(r.issues).toEqual(['stinging', 'fragrance_reaction']);
    expect(r.baseType).toBe('dry');
    expect(r.confidence).toBe('clear');
  });

  it('reports a single reaction without calling the skin sensitive', () => {
    const r = inferSkinType(
      answer(
        ['after-wash', 'comfortable'],
        ['midday', 'none'],
        ['pores', 'barely'],
        ['flaking', 'never'],
        ['fragrance', 'often'],
      ),
    );
    expect(r.skinType).toBe('normal');
    expect(r.issues).toEqual(['fragrance_reaction']);
  });

  it('keeps a lone reaction when nothing else was answered', () => {
    const r = inferSkinType(answer(['rash', 'often']));
    expect(r.skinType).toBeNull();
    expect(r.issues).toEqual(['rash']);
  });

  it('lists reactions in a fixed order whatever order they were answered in', () => {
    const r = inferSkinType(answer(['rash', 'often'], ['sting', 'often'], ['redness', 'often']));
    expect(r.issues).toEqual(['stinging', 'redness', 'rash']);
  });

  it('is not moved by "rarely" answers', () => {
    const r = inferSkinType(answer(['sting', 'rarely'], ['redness', 'rarely']));
    expect(r.issues).toEqual([]);
    expect(r.skinType).toBeNull();
  });

  it('ignores inherited keys', () => {
    const r = inferSkinType(JSON.parse('{"__proto__": "x", "constructor": "y"}'));
    expect(r.answered).toBe(0);
  });

  it('ignores any number of unrelated entries and scores the rest the same', () => {
    const real = answer(['after-wash', 'tight'], ['flaking', 'often']);
    const big: Record<string, string> = { ...real };
    for (let i = 0; i < 50_000; i++) big[`q${i}`] = 'x';
    expect(inferSkinType(big)).toEqual({ ...inferSkinType(real) });
    expect(inferSkinType(big).answered).toBe(2);
  });
});

describe('issueNotes', () => {
  const matched = [
    { inciName: 'LINALOOL', riskCategories: ['fragrance_allergen'] as const },
    { inciName: 'CITRIC ACID', riskCategories: ['common_irritant'] as const },
    { inciName: 'LIMONENE', riskCategories: ['fragrance_allergen', 'common_irritant'] as const },
    { inciName: 'LINALOOL', riskCategories: ['fragrance_allergen'] as const },
    { inciName: 'GLYCERIN', riskCategories: [] },
  ];

  it('ties each reported reaction to the ingredients in its categories, once each', () => {
    expect(issueNotes(matched, ['fragrance_reaction', 'stinging'])).toEqual([
      { issue: 'stinging', ingredients: ['CITRIC ACID', 'LIMONENE'] },
      { issue: 'fragrance_reaction', ingredients: ['LINALOOL', 'LIMONENE'] },
    ]);
  });

  it('says nothing about a reaction that was not reported or has no match', () => {
    expect(issueNotes(matched, [])).toEqual([]);
    expect(issueNotes(matched, ['rash'])).toEqual([]);
  });

  it('does not repeat a reaction listed twice', () => {
    expect(issueNotes(matched, ['redness', 'redness'])).toHaveLength(1);
  });

  it('gives every reaction a label, description and category', () => {
    for (const issue of Object.values(SENSITIVITY_ISSUES)) {
      expect(issue.label).not.toBe('');
      expect(issue.description).not.toBe('');
      expect(issue.categories.length).toBeGreaterThan(0);
    }
  });
});
