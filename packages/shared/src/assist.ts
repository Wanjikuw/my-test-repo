/**
 * The wire contract for the model-assisted routes: `GET /capabilities`, `POST /ocr` and
 * `POST /notes`.
 *
 * Model output is advisory. Nothing in these shapes is read by `score()`, and a model
 * note can only lead to a verdict through `resolvesTo` — a name the user substitutes into
 * the label themselves, which is then checked against the cited reference data like any
 * other name.
 */

export interface Capabilities {
  /** Present when the API can send a photograph to a remote OCR model. */
  remoteOcr: { model: string } | null;
  /** Present when the API can ask a language model about unrecognised names. */
  modelNotes: { model: string } | null;
}

export interface OcrResponse {
  /** The ingredient list as the model transcribed it. Unchecked until the user submits it. */
  text: string;
  model: string;
}

export type NoteConfidence = 'high' | 'medium' | 'low';

export interface ModelNote {
  /** The unrecognised name exactly as it was sent. */
  rawText: string;
  /** The standard INCI name the model proposes, or null when it could not name one. */
  proposedInciName: string | null;
  /** One plain sentence on what the substance is. Model-generated, never a citation. */
  summary: string;
  confidence: NoteConfidence;
  /** The proposal resolved against the cited reference data, or null when it does not resolve. */
  resolvesTo: { id: string; inciName: string } | null;
}

export interface NotesResponse {
  notes: ModelNote[];
  model: string;
}
