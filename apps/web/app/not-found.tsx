import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">Not found</p>
      <h1 className="mt-4 font-serif text-4xl">That page does not exist.</h1>
      <p className="mt-4 max-w-xl leading-relaxed text-muted">
        The address may have been mistyped, or the page may have moved. The label checker is one
        step away.
      </p>
      <Link
        href="/check"
        className="mt-8 inline-block rounded-md bg-ink px-6 py-3 text-sm text-shell"
      >
        Check a label
      </Link>
    </main>
  );
}
