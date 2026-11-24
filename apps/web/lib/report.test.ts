import { describe, expect, it } from 'vitest';
import { reportLink } from './report';

const result = { tier: 'Caution', coverage: { identified: 3, total: 4 } } as const;

describe('reportLink', () => {
  it('is absent when no address is configured or the address is malformed', () => {
    expect(reportLink(undefined, result, ['Aqua'])).toBeNull();
    expect(reportLink('  ', result, ['Aqua'])).toBeNull();
    expect(reportLink('not an address', result, ['Aqua'])).toBeNull();
  });

  it('carries the verdict and the label as read, encoded', () => {
    const link = reportLink('help@example.com', result, ['Aqua', 'Parfum & oil']) ?? '';
    expect(link.startsWith('mailto:help@example.com?subject=')).toBe(true);
    const body = decodeURIComponent(link.split('&body=')[1] ?? '');
    expect(body).toContain('Verdict: Caution');
    expect(body).toContain('Identified: 3 of 4');
    expect(body).toContain('Label as read: Aqua, Parfum & oil');
  });
});
