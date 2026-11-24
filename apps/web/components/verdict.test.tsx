import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AnalyzeResponse } from '@allergy-checker/shared';
import { Verdict } from './verdict';

const result = (tier: AnalyzeResponse['tier']) =>
  ({ tier, coverage: { total: 4, identified: 4 } }) as AnalyzeResponse;

describe('verdict', () => {
  it('names what triggered it, at most three', () => {
    const html = renderToStaticMarkup(
      <Verdict result={result('Avoid')} flagged={['Linalool', 'Limonene', 'Geraniol', 'Parfum']} />,
    );
    expect(html).toContain('Because of Linalool, Limonene, Geraniol and 1 more.');
  });

  it('says nothing about causes when nothing was flagged', () => {
    expect(renderToStaticMarkup(<Verdict result={result('Safe')} />)).not.toContain('Because of');
  });
});
