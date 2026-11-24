/**
 * `GET /product/:barcode`: a product's printed ingredient text, taken from Open Beauty Facts.
 * Community-entered and unchecked, so it only fills the editable box and is scored like typed text.
 */
export interface ProductResponse {
  barcode: string;
  name: string | null;
  brand: string | null;
  ingredientsText: string;
}
