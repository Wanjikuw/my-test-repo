/**
 * OCR output, made into label text the API's splitter can read.
 *
 * Both readers return the list as it was laid out on the pack, and on a pack a line break
 * is almost always a wrap in the middle of a name, not a separator. The API treats a
 * newline as a separator, which is right for a pasted list and wrong for this, so the
 * lines are rejoined here before the text reaches the editable box.
 *
 * Deliberately no heading or may-contain handling: the API does that for pasted and
 * photographed text alike, and a second implementation here could disagree with it.
 */
export function cleanOcrText(raw: string): string {
  const text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/^```[a-z]*\s*|\s*```$/gi, '')
    // A word broken across a line by the typesetter: `Hexa-\nnediol`. A lower-case
    // continuation means the hyphen was a wrap and goes; anything else keeps it, so
    // `PEG-\n40` stays `PEG-40`.
    .replace(/(\p{L})-\n(?=\p{Ll})/gu, '$1')
    .replace(/-\n/g, '-');

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // One name per line and no commas anywhere: here the line breaks are the separators.
  if (lines.length > 1 && !/[,，;]/.test(text)) return lines.join(', ');

  // A line that ends a sentence is where the list stops and the pack's other text begins.
  return lines
    .map((line, i) => (i < lines.length - 1 && /\.$/.test(line) ? `${line}\n` : `${line} `))
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/ +,/g, ',')
    .trim();
}
