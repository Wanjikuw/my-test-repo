/**
 * Barcodes are pasted or typed from a pack, often with spaces or hyphens between the groups.
 * Returns the digits when they could be an EAN or UPC (8 to 14 digits), otherwise null.
 */
export function normaliseBarcode(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  return /^\d{8,14}$/.test(digits) ? digits : null;
}
