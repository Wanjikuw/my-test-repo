import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy - Angalia',
  description:
    'What stays on your device, what is sent when you check a label, and who handles it.',
};

const SECTIONS = [
  {
    heading: 'What stays on your device',
    paragraphs: [
      'Your skin type, sun exposure and declared allergies are kept in this browser, in local storage under the name angalia-profile. They are sent to the service only inside an analysis request. Clearing the data this site stores removes them. There is no account to sign up for.',
    ],
  },
  {
    heading: 'What is sent when you check a label',
    paragraphs: [
      'The ingredient list you typed or read, together with your skin type, sun exposure and declared allergies, is sent to the Angalia service to be matched against the reference data. The service does not keep it: it has no database of requests, and it does not write the list to its logs.',
      'Like any web service, it does record the technical details of each request in operational logs held by its hosting provider: the address requested, the time, the response and the IP address of the visitor. A search for a single ingredient forms part of the address, so the search term appears there. If the service fails, an error report may be sent to Sentry; it carries the request address and an identifier, not the ingredient list.',
    ],
  },
  {
    heading: 'Photographs',
    paragraphs: [
      'By default a photograph is read on your device and is not uploaded. The first time you use the reader, your browser downloads its text-recognition engine and language data from the jsDelivr content delivery network (cdn.jsdelivr.net), which sees your IP address and browser details as any host would.',
      'The check page can also offer a second reader, which sends the photograph to Alibaba Cloud Model Studio (Qwen), operated by a company outside the European Union, to be read. Angalia does not store it. Optional notes on unrecognised names send those names to the same provider. Both are off unless the operator turns them on, and the check page shows the choice only when they are on.',
    ],
  },
  {
    heading: 'Cookies and tracking',
    paragraphs: [
      'The site sets no cookies of its own and loads no analytics or advertising scripts.',
    ],
  },
  {
    heading: 'Who handles it',
    paragraphs: [
      'The pages are served by Vercel and the analysis service runs on Render. The reference data is held in a Supabase database that contains no personal data.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <h1 className="font-serif text-3xl">Privacy</h1>
      <p className="mt-2 max-w-2xl leading-relaxed text-muted">
        What stays on your device, what is sent when you check a label, and who handles it.
      </p>

      {SECTIONS.map((section) => (
        <section key={section.heading} className="mt-12">
          <h2 className="font-serif text-2xl">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-3 max-w-2xl leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <p className="mt-12 text-xs text-muted">
        Last updated 3 November 2026. This page describes how the service behaves today, and changes
        when it does.
      </p>
    </main>
  );
}
