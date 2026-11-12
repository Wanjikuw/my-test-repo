import { NextResponse, type NextRequest } from 'next/server';
import { accessDecision, routeAccess } from './lib/auth/paths';
import { updateSession } from './lib/supabase/middleware';

/**
 * A redirect is a new response, so what the session renewal put on the old one has to be
 * copied across, or the renewed session is lost and the visitor is signed out at random.
 */
function redirectKeepingSession(
  request: NextRequest,
  to: string,
  session: NextResponse,
): NextResponse {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  for (const cookie of session.cookies.getAll()) redirect.cookies.set(cookie);
  for (const name of ['cache-control', 'expires', 'pragma']) {
    const value = session.headers.get(name);
    if (value) redirect.headers.set(name, value);
  }
  if (!redirect.headers.has('cache-control')) {
    redirect.headers.set('cache-control', 'private, no-store');
  }
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // A public page is not looked at: its answer does not depend on who is asking.
  if (routeAccess(pathname) === 'public') return NextResponse.next();

  const session = await updateSession(request);
  const decision = accessDecision({
    pathname,
    search,
    signedIn: session.signedIn,
    next: searchParams.get('next'),
  });

  if (decision.action === 'redirect') {
    return redirectKeepingSession(request, decision.to, session.response);
  }
  return session.response;
}

export const config = {
  // Everything except the build's own files, the error-reporting tunnel, the metadata files and
  // static assets, none of which are pages. A public image would otherwise be sent to the sign-in
  // page for a visitor who has none, and the landing page's photographs are public. Each exclusion
  // ends at a boundary, so a page that merely starts with one of these words is still protected.
  // Next needs this written out literally.
  matcher: [
    '/((?!_next/static/|_next/image(?:/|$)|monitoring(?:/|$)|(?:robots\\.txt|sitemap\\.xml|manifest\\.webmanifest)$|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
