import { NOT_CONFIGURED } from '../../lib/auth/messages';

/** Google's own mark, in its own colours: it is a logo, so it is the one place the palette does not apply. */
function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function GoogleButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-md border border-muted/40 bg-surface px-4 py-3 text-sm hover:border-ink disabled:opacity-40"
    >
      <GoogleMark />
      {label}
    </button>
  );
}

/** Between the two ways in. The word is read out; the rules are only for the eye. */
export function Or() {
  return (
    <div className="flex items-center gap-4 text-xs tracking-widest text-muted uppercase">
      <span aria-hidden className="h-px flex-1 bg-line" />
      or
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  );
}

/** A failure the person can act on. It is announced as soon as it appears. */
export function FormError({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-avoid/30 bg-avoid-wash p-4 text-sm leading-relaxed text-avoid"
    >
      {children}
    </p>
  );
}

/** A state of the site rather than of what was typed: not a warning, so it uses the neutral. */
export function Notice({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-line bg-unread-wash p-4 text-sm leading-relaxed text-unread">
      {children}
    </p>
  );
}

/**
 * For a build made without the sign-in settings. Someone reading the page needs the first
 * sentence. Whoever set the site up needs to know which settings, and only they are told.
 */
export function NotConfigured() {
  return (
    <Notice>
      {process.env.NODE_ENV === 'production'
        ? NOT_CONFIGURED
        : `${NOT_CONFIGURED} Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for the web app, then restart it.`}
    </Notice>
  );
}
