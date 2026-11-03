import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About and sources - Angalia',
  description:
    'Where the reference data comes from, how it is licensed, and what Angalia cannot tell you.',
};

const SOURCES = [
  {
    name: 'Ingredient identities',
    body: 'The Glossary of Common Ingredient Names published by the European Commission under Decision 96/335/EC supplies the names, the synonyms and the functions. It predates Regulation (EC) No 1223/2009, so it says what an ingredient is and never whether it is restricted.',
  },
  {
    name: 'Prohibitions and restrictions',
    body: 'Regulation (EC) No 1223/2009 and its Annexes II and III, including the fragrance allergens added to Annex III by Commission Regulation (EU) 2023/1545. Every flag names its annex and entry number. European Union legal texts are reused under the terms published on EUR-Lex.',
  },
  {
    name: 'Other risk tags',
    body: 'Tags for common irritants, comedogenic ingredients and ingredients that react to sunlight are curated from named published sources, and each tag cites its own. They are weaker evidence than the Annexes.',
  },
  {
    name: 'Labels used to measure coverage',
    body: 'The coverage figures on the home page were measured against product labels from Open Beauty Facts. Contains information from Open Beauty Facts, which is made available under the Open Database License (ODbL) 1.0.',
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <h1 className="font-serif text-3xl">About and sources</h1>
      <p className="mt-2 max-w-2xl leading-relaxed text-muted">
        Angalia checks a cosmetic ingredient list against EU Regulation (EC) No 1223/2009 and your
        skin profile. This page says where its reference data comes from and what it cannot tell
        you.
      </p>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">Where the data comes from</h2>
        <dl className="mt-6 divide-y divide-line border-y border-line">
          {SOURCES.map((source) => (
            <div key={source.name} className="py-5 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-8">
              <dt className="font-medium">{source.name}</dt>
              <dd className="mt-2 leading-relaxed text-muted sm:mt-0">{source.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">What it cannot tell you</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          The strongest verdict Angalia gives is that nothing it could identify triggered a rule.
          That is not a claim that a product is safe. Names it cannot identify are counted and shown
          beside the verdict, and none of this is medical advice. For a reaction, or for a condition
          a cosmetic could affect, ask a clinician.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">The method is public</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          The source code, and the data rubric that sets out how each source is used and how each
          tag is assigned, are in the{' '}
          <a
            href="https://github.com/Wanjikuw/my-test-repo"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            project repository
          </a>
          .
        </p>
      </section>
    </main>
  );
}
