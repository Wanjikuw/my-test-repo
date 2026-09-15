import Link from 'next/link';

/**
 * The landing surface. Full-bleed bands and large type here; the tool itself stays quiet.
 *
 * Every figure below is measured rather than decorative — they come from the seeded corpus
 * and the coverage run over 1,299 real retail labels. The unflattering one is included on
 * purpose: a page claiming rigour while hiding its own recall would be doing exactly what
 * the verdict screen refuses to do.
 */
const FIGURES = [
  { value: '7,729', label: 'reference ingredients' },
  { value: '81', label: 'Annex III fragrance allergens' },
  { value: '104', label: 'risk tags, each with its own citation' },
  { value: '69%', label: 'of printed label names it can read' },
];

const LIMITS = [
  {
    heading: 'Tell you a product is safe',
    body: 'The reference data covers substances the regulation names and the EU ingredient glossary lists. A typical label carries around ten names it holds no record of. Those are reported as unchecked, never as fine.',
  },
  {
    heading: 'Guess',
    body: 'Where a name is close to something known, Angalia offers the spelling as a suggestion only. A near-miss never reaches the rules that decide the verdict.',
  },
  {
    heading: 'Hide its sources',
    body: 'Every flag names the provision behind it — the annex and the entry number — so you can check the claim rather than trust it.',
  },
  {
    heading: 'Ask you to sign up',
    body: 'Your skin type and declared allergies stay on your device. The analysis needs nothing that would have to be stored.',
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:py-28">
          <p className="text-xs font-medium tracking-widest text-muted uppercase">
            Regulation (EC) No 1223/2009
          </p>
          <h1 className="mt-5 max-w-2xl font-serif text-5xl leading-[1.05] sm:text-6xl">
            Read the label before your skin does.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Angalia checks a cosmetic ingredient list against EU regulation and your skin profile —
            and tells you plainly which ingredients it could not identify.
          </p>
          <Link
            href="/check"
            className="mt-9 inline-block rounded-md bg-ink px-7 py-3.5 text-sm text-shell"
          >
            Check a label
          </Link>
        </div>
      </section>

      <section className="border-b border-line">
        <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {FIGURES.map((figure) => (
            <div key={figure.label} className="bg-shell px-5 py-10">
              <dt className="font-serif text-4xl">{figure.value}</dt>
              <dd className="mt-2 text-sm leading-snug text-muted">{figure.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="font-serif text-3xl">What it will not do</h2>
        <div className="mt-8 grid gap-10 sm:grid-cols-2">
          {LIMITS.map((limit) => (
            <div key={limit.heading}>
              <h3 className="font-medium">{limit.heading}</h3>
              <p className="mt-2 leading-relaxed text-muted">{limit.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
