import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy - Angalia',
  description:
    'What an account stores, what stays on your device, what is sent when you check a label, and who handles it.',
};

const SECTIONS = [
  {
    heading: 'Your account',
    paragraphs: [
      'The check page needs an account. To make one you give a first name, a last name, an email address and a password, or you sign in with Google. Supabase provides the sign-in service. It stores your name and email address, and your password only as a one-way hash that nobody at Angalia can read. If you use Google, Google tells Supabase your name, your email address and the address of your profile picture, and Supabase stores those as well. Supabase also sends the emails that confirm an address or reset a password.',
      'The Angalia service does not store any of this. With each request it receives a sign-in token, checks its signature and expiry against Supabase’s public keys, and does nothing else with it. An account is kept until it is deleted. The operator can delete one on request, together with everything held with it.',
    ],
  },
  {
    heading: 'Your skin profile',
    paragraphs: [
      'Your skin type, the reactions you report (such as stinging or a reaction to fragrance), sun exposure and declared allergies are kept in this browser, in local storage under the name angalia-profile. They are sent to the service only inside an analysis request. Clearing the data this site stores removes them.',
      'If you are signed in you can choose “Save to my account”, and only then is a copy stored in your account, in a table that row-level security restricts to you. It is how your profile follows you to another device. Choosing “Remove from my account” deletes that copy at once, and deleting your account deletes it with everything else. Signing out on a device removes the local copy once the account copy is up to date. Skin type and allergies can say something about your health, which is why nothing is saved to your account unless you ask.',
      'The skin-type questions are scored in your browser, and the answers are not kept or sent anywhere: only the result you accept is stored. The result is cosmetic guidance and not a diagnosis.',
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
      'The site sets cookies only to keep you signed in. Their names begin with sb-, and signing out removes them. There are no analytics or advertising cookies, and no analytics or advertising scripts are loaded.',
    ],
  },
  {
    heading: 'Who handles it',
    paragraphs: [
      'The pages are served by Vercel and the analysis service runs on Render. Accounts and sign-in are handled by Supabase, in a project hosted in London (AWS eu-west-2). The same project holds the reference data, which contains no personal data. If you choose Google, Google handles that step of signing in under its own privacy policy.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <h1 className="font-serif text-3xl">Privacy</h1>
      <p className="mt-2 max-w-2xl leading-relaxed text-muted">
        What an account stores, what stays on your device, what is sent when you check a label, and
        who handles it.
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
        Last updated 12 November 2026. This page describes how the service behaves today, and
        changes when it does.
      </p>
    </main>
  );
}
