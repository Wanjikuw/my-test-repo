import Link from 'next/link';
import { LabelPoster, LabelReading } from '../components/specimen';
import { Photograph } from '../components/photograph';
import { Reveal } from '../components/reveal';

/**
 * Full-bleed bands, large type and scroll rhythm — the language the design instructions
 * reserve for this surface. The tool itself stays quiet; the landing page is where the
 * argument for the rigour gets made.
 *
 * Backgrounds alternate deliberately (surface, ink, surface tiles, shell, surface, shell)
 * so each band reads as its own plate rather than as one long scroll.
 *
 * Photography opens and closes the page and appears nowhere between. The middle of the
 * page is the argument, and it is made in type and figures; a product shot next to a
 * coverage number would be selling rather than reporting. Both frames are toned into the
 * palette and carry the type on their empty side.
 *
 * The hero is deliberately not revealed. Animating what is already on screen at load buys
 * nothing and risks a flash of hidden content on the one block everybody sees.
 *
 * Every figure is measured rather than decorative: they come from the seeded corpus and
 * the coverage run over 1,299 real retail labels. The unflattering one is here on purpose.
 * A page claiming rigour while hiding its own recall would be doing exactly what the
 * verdict screen refuses to do.
 */
const FIGURES = [
  { value: '7,729', label: 'reference ingredients' },
  { value: '81', label: 'Annex III fragrance allergens, cited per entry' },
  { value: '1,299', label: 'real retail labels measured against' },
  { value: '69%', label: 'of printed names it can read' },
];

const METHOD = [
  {
    step: '01',
    heading: 'It reads the label, not the marketing',
    body: 'Printed lists break in specific ways. Commas sit inside chemical names, colour indices run in sequence, retailers paste in invisible characters. The parser was built against labels that broke it.',
  },
  {
    step: '02',
    heading: 'It resolves names to the regulation',
    body: 'Aqua and Water are the same ingredient, and the EU glossary says so. Butylphenyl Methylpropional is the name on the bottle; 2-(4-tert-butylbenzyl) propionaldehyde is the name Annex II prints. Both resolve.',
  },
  {
    step: '03',
    heading: 'It says what it could not check',
    body: 'Anything the reference data has no record of is reported as unchecked, counted, and shown beside the verdict at the same size. A typical label carries around ten of them.',
  },
];

const LIMITS = [
  {
    heading: 'It will not tell you a product is safe',
    body: 'The strongest verdict available is that nothing which could be identified triggered a rule. That is not the same claim, and the interface never rounds it up to one.',
  },
  {
    heading: 'It will not guess',
    body: 'Where a printed name is close to something known, the spelling is offered as a suggestion and marked as one. A near-miss never reaches the rules that decide the verdict.',
  },
  {
    heading: 'It will not hide its sources',
    body: 'Every flag names the provision behind it — the annex and the entry number — so the claim can be checked rather than trusted.',
  },
  {
    heading: 'It will not ask you to sign up',
    body: 'Skin type and declared allergies stay on your device. The analysis needs nothing that would have to be stored.',
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="border-b border-line bg-surface">
        <div className="relative isolate flex min-h-[30rem] items-center overflow-hidden sm:min-h-[36rem]">
          {/* Held right of centre: the marble is empty on the left, which is where the type goes. */}
          <Photograph
            src="/hero/marble.jpg"
            tone="surface"
            saturate={0.55}
            objectPosition="72% 45%"
            priority
          />
          <div className="relative mx-auto w-full max-w-5xl px-5 py-20 sm:py-24">
            <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">
              Regulation (EC) No 1223/2009
            </p>
            <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.02] sm:text-7xl">
              Read the label before your skin does.
            </h1>
            <div className="mt-7 flex flex-wrap items-center gap-x-10 gap-y-6">
              <p className="max-w-xl text-lg leading-relaxed text-muted">
                Angalia checks a cosmetic ingredient list against EU regulation and your skin
                profile, and tells you plainly which ingredients it could not identify.
              </p>
              <Link
                href="/check"
                className="rounded-md bg-ink px-8 py-4 text-sm tracking-wide text-shell"
              >
                Check a label
              </Link>
            </div>
          </div>
        </div>

        <Reveal className="mx-auto max-w-5xl border-t border-line px-5 py-12 sm:py-16">
          <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">
            A label, as printed
          </p>
          <div className="mt-7">
            <LabelPoster />
          </div>
        </Reveal>
      </section>

      <section className="bg-ink text-shell">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:py-28">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-lg font-serif text-4xl leading-tight sm:text-5xl">
              The same label, read.
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-shell/60">
              Nine names. One prohibited outright, two restricted and declarable, one the reference
              data has never heard of.
            </p>
          </Reveal>
          <Reveal className="mt-12" delay={60}>
            <LabelReading />
          </Reveal>
        </div>
      </section>

      <section className="border-b border-line py-px">
        <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {FIGURES.map((figure, i) => (
            <Reveal key={figure.label} className="bg-surface px-5 py-12" delay={i * 50}>
              <dt className="font-serif text-4xl sm:text-5xl">{figure.value}</dt>
              <dd className="mt-3 text-sm leading-snug text-muted">{figure.label}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:py-24">
        <Reveal>
          <h2 className="font-serif text-4xl">How it reads a label</h2>
        </Reveal>
        <div className="mt-12 space-y-px bg-line">
          {METHOD.map((item, i) => (
            <Reveal
              key={item.step}
              className="grid gap-4 bg-shell py-8 sm:grid-cols-[6rem_1fr] sm:gap-10"
              delay={i * 50}
            >
              <p className="font-serif text-3xl text-line sm:text-4xl">{item.step}</p>
              <div className="max-w-2xl">
                <h3 className="font-serif text-2xl">{item.heading}</h3>
                <p className="mt-3 leading-relaxed text-muted">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:py-24">
          <Reveal>
            <h2 className="max-w-xl font-serif text-4xl leading-tight">
              What it will not do, stated up front.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {LIMITS.map((limit, i) => (
              <Reveal key={limit.heading} className="border-t border-line pt-5" delay={i * 50}>
                <h3 className="font-medium">{limit.heading}</h3>
                <p className="mt-2 leading-relaxed text-muted">{limit.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden">
        {/* Held low: the surf runs across the top of the frame and the products sit under it. */}
        <Photograph src="/hero/shore.jpg" tone="shell" saturate={0.3} objectPosition="50% 68%" />
        <Reveal className="relative mx-auto max-w-5xl px-5 py-24 sm:py-32">
          <h2 className="max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">
            Paste a list, or photograph the back of the bottle.
          </h2>
          <p className="mt-5 max-w-lg leading-relaxed text-muted">
            Reading a photograph happens on your device. Nothing is uploaded, and no account is
            required.
          </p>
          <Link
            href="/check"
            className="mt-10 inline-block rounded-md bg-ink px-8 py-4 text-sm tracking-wide text-shell"
          >
            Check a label
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
