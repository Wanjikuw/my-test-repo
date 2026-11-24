import { describe, expect, it } from 'vitest';
import { buildCsp } from './csp.mjs';

const directive = (policy: string, name: string) =>
  policy
    .split('; ')
    .find((part) => part.startsWith(`${name} `))
    ?.slice(name.length + 1)
    .split(' ');

describe('buildCsp', () => {
  const policy = buildCsp({
    apiUrl: 'https://api.example.com/some/path',
    supabaseUrl: 'https://abc.supabase.co',
  });

  it('lets the page call only itself, the API and Supabase', () => {
    expect(directive(policy, 'connect-src')).toEqual([
      "'self'",
      'https://api.example.com',
      'https://abc.supabase.co',
    ]);
  });

  it('keeps scripts to this origin and allows WebAssembly for the OCR engine', () => {
    const scripts = directive(policy, 'script-src');
    expect(scripts).toContain("'self'");
    expect(scripts).toContain("'wasm-unsafe-eval'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(scripts?.some((source) => source.startsWith('http'))).toBe(false);
  });

  it('forbids framing, plugins, and a changed base or form target', () => {
    expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(policy, 'object-src')).toEqual(["'none'"]);
    expect(directive(policy, 'base-uri')).toEqual(["'self'"]);
    expect(directive(policy, 'form-action')).toEqual(["'self'"]);
  });

  it('upgrades insecure requests in production only, and permits eval only in development', () => {
    expect(policy).toContain('upgrade-insecure-requests');
    const dev = buildCsp({ development: true });
    expect(dev).not.toContain('upgrade-insecure-requests');
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
  });

  it('ignores an unset or malformed origin instead of failing the build', () => {
    expect(directive(buildCsp({ apiUrl: 'not a url' }), 'connect-src')).toEqual(["'self'"]);
    expect(directive(buildCsp(), 'connect-src')).toEqual(["'self'"]);
  });

  it('names no third-party host anywhere but the two it was given', () => {
    expect(policy).not.toMatch(/jsdelivr|googleapis|gstatic|unpkg/);
  });
});
