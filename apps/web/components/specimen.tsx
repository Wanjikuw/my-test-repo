/**
 * One real label, shown twice: as it is printed, then as the engine reads it.
 *
 * The specimen is the imagery. There is no photograph of a woman applying cream here
 * because the product's own material is more specific and cannot be mistaken for anyone
 * else's landing page — and because every mark on it is a claim we can cite.
 *
 * The three findings below are real: Annex III entry 84 restricts Linalool, entry 88
 * Limonene, and Annex II entry 1666 prohibits Butylphenyl Methylpropional outright.
 */
export type Mark = 'flagged' | 'noted' | 'unread' | null;

export interface SpecimenName {
  text: string;
  mark: Mark;
  /** Shown in the reading, not on the printed label. */
  finding?: string;
}

export const SPECIMEN: SpecimenName[] = [
  { text: 'Aqua', mark: null },
  { text: 'Glycerin', mark: null },
  {
    text: 'Butylphenyl Methylpropional',
    mark: 'flagged',
    finding: 'Annex II entry 1666 — prohibited in cosmetics',
  },
  {
    text: 'Linalool',
    mark: 'noted',
    finding: 'Annex III entry 84 — declarable fragrance allergen',
  },
  {
    text: 'Limonene',
    mark: 'noted',
    finding: 'Annex III entry 88 — declarable fragrance allergen',
  },
  { text: 'Phenoxyethanol', mark: null },
  { text: 'Tocopherol', mark: null },
  { text: '1,2-Hexanediol', mark: 'unread', finding: 'not in the reference data' },
  { text: 'Xanthan Gum', mark: null },
];

const PRINTED: Record<NonNullable<Mark>, string> = {
  flagged: 'bg-avoid-wash text-avoid decoration-avoid/50',
  noted: 'bg-caution-wash text-caution decoration-caution/50',
  unread: 'bg-unread-wash text-unread decoration-unread/50',
};

/**
 * The label as printed, marked in place. Set large: it is the hero image.
 *
 * `box-decoration-clone` matters on a narrow screen. The longest INCI name here wraps on a
 * phone, and the default slicing leaves the highlight open on one side of the break, which
 * reads as a rendering fault rather than as one marked name.
 */
export function LabelPoster() {
  return (
    <p className="text-lg leading-[2.1] tracking-wide text-muted sm:text-2xl sm:leading-[2] md:text-3xl">
      {SPECIMEN.map((name, i) => (
        <span key={name.text}>
          <span
            className={
              name.mark
                ? `${PRINTED[name.mark]} box-decoration-clone rounded px-2 py-1 underline underline-offset-[6px]`
                : ''
            }
          >
            {name.text}
          </span>
          {i < SPECIMEN.length - 1 && <span className="text-line">, </span>}
        </span>
      ))}
    </p>
  );
}

const READ: Record<NonNullable<Mark>, { rule: string; label: string }> = {
  flagged: { rule: 'border-avoid-lift', label: 'text-avoid-lift' },
  noted: { rule: 'border-caution-lift', label: 'text-caution-lift' },
  unread: { rule: 'border-unread-lift', label: 'text-unread-lift' },
};

/**
 * The same label, read. Every row either cites a provision or says it could not check.
 *
 * Stacked below `sm` rather than wrapped: with `justify-between`, a short name and a short
 * finding both fit on one line and get pushed to opposite edges, so the rows stopped
 * agreeing with each other and the finding clipped.
 */
export function LabelReading() {
  return (
    <ul className="divide-y divide-white/10">
      {SPECIMEN.map((name) => {
        const tone = name.mark ? READ[name.mark] : null;
        return (
          <li
            key={name.text}
            className={`flex flex-col gap-1 border-l-4 py-5 pl-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:pl-6 ${
              tone ? tone.rule : 'border-safe-lift'
            }`}
          >
            <span className="text-lg sm:text-xl">{name.text}</span>
            <span className={`text-sm ${tone ? tone.label : 'text-shell/50'}`}>
              {name.finding ?? 'identified, nothing on record'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
