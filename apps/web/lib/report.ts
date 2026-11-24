/**
 * A mailto link for reporting a wrong or confusing result. It carries only what the person is
 * looking at (the verdict and the label as read), never their profile, and nothing is sent
 * until they press send in their own mail app. Returns null when no address is configured.
 */
export function reportLink(
  address: string | undefined,
  result: { tier: string; coverage: { identified: number; total: number } },
  printed: string[],
): string | null {
  const to = address?.trim();
  if (!to || !/^[^\s@]+@[^\s@]+$/.test(to)) return null;

  const body = [
    'What looks wrong:',
    '',
    '',
    '---',
    `Verdict: ${result.tier}`,
    `Identified: ${result.coverage.identified} of ${result.coverage.total}`,
    `Label as read: ${printed.join(', ')}`,
  ].join('\n');

  return `mailto:${to}?subject=${encodeURIComponent('Angalia: a result looks wrong')}&body=${encodeURIComponent(body)}`;
}
