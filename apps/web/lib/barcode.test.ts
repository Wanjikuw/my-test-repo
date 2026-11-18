import { describe, expect, it } from 'vitest';
import { normaliseBarcode } from './barcode';

describe('normaliseBarcode', () => {
  it('accepts 8 to 14 digits, ignoring spaces and hyphens', () => {
    expect(normaliseBarcode('3600550000000')).toBe('3600550000000');
    expect(normaliseBarcode(' 3600 5500-00000 ')).toBe('3600550000000');
    expect(normaliseBarcode('12345678')).toBe('12345678');
  });

  it('refuses anything else', () => {
    expect(normaliseBarcode('')).toBeNull();
    expect(normaliseBarcode('1234567')).toBeNull();
    expect(normaliseBarcode('123456789012345')).toBeNull();
    expect(normaliseBarcode('36005500000ab')).toBeNull();
  });
});
