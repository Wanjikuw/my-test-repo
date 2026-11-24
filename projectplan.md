# Angalia — Project Plan & Status

**Owner:** Wanjiku Wakiama Kaimuri · **Repo:** `Wanjikuw/my-test-repo` · **Scope:** web only

The live status of the build. The September plan, with the dataset provenance and recall
measurements, is archived in [docs/history/projectplan-2026-09.md](docs/history/projectplan-2026-09.md).

Legend: ✅ built and verified in CI-equivalent checks · 🟡 built, needs a step from the owner ·
⬜ not done

## What the product is

Angalia reads a cosmetic ingredient list (typed, searched, photographed or fetched from a
barcode) and checks it against EU Regulation (EC) No 1223/2009 and the person's skin profile.
The verdict always shows how much of the label could be identified, because unidentified names
are the main limit on what it can claim.

## Status

| Area                                                                            | State |
| ------------------------------------------------------------------------------- | ----- |
| Reference data, scoring rules, coverage measurement                             | ✅    |
| Analysis API (Fastify), per-IP and per-account rate limits, token verification  | ✅    |
| Web app: check page, verdict with reasons, list-position hint, OCR slip fixes   | ✅    |
| Sign-up, sign-in, Google, password reset, deny-by-default middleware            | ✅    |
| Skin profile, skin-type quiz, optional sync to the account (row-level security) | ✅    |
| Photo reading on the device, engine and language data served by Angalia         | ✅    |
| Barcode lookup (Open Beauty Facts)                                              | ✅    |
| Delete my account                                                               | 🟡    |
| Recent checks (device only) and "Report a problem" link                         | 🟡    |
| Content-Security-Policy                                                         | 🟡    |
| Keep-awake workflow (Supabase free tier pauses, Render sleeps)                  | 🟡    |
| Error reporting (Sentry, web and API)                                           | 🟡    |
| End-to-end browser tests (Playwright)                                           | ⬜    |
| Usability testing on real phones and re-measuring label coverage                | ⬜    |
| Sending email from an Angalia domain instead of a personal Gmail account        | ⬜    |

### Steps that only the owner can do

1. Run the ship scripts in order, and push (`ship-7`, `ship-8`, `ship-9`). They commit and push
   after `pnpm verify` and smoke tests pass.
2. Run `apps/api/drizzle/manual/0003_delete_account.sql` in the Supabase SQL editor.
   Until then, "Delete my account" reports that deletion is not available and deletes nothing.
3. Set `NEXT_PUBLIC_REPORT_EMAIL` in Vercel and redeploy, or the report link stays hidden.
4. Add the repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY`, then run "Keep awake" once.
5. After the deploy, open the site with DevTools Console open and use sign-in, Google, the
   camera, photo reading and barcode lookup. Report any Content-Security-Policy messages. When
   the console is clean, the policy changes from report-only to enforcing in `next.config.mjs`.
6. Set `SUPABASE_URL` on Render (the API refuses to start without it) and delete the unused
   `QWEN_API_KEY` there.

## Decisions

- **No third-party AI.** Qwen was removed. Photos are read on the device and nothing else is
  sent to a model, which keeps the privacy page short and true.
- **No service-role key anywhere.** The web app reads and writes the profile with the user's own
  token and row-level security. Account deletion is a database function that can only delete the
  caller.
- **Device-only history.** Past labels never leave the browser and are cleared on sign-out and on
  account deletion.
- **Deny by default.** Every web route needs a session unless it is on a short public list, and
  every API route except `/health` needs a token.

## Accepted risks

| Risk                                                                    | Why accepted                                                      |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Database password was exposed earlier and has **not been rotated**      | The owner chose to defer it. Rotate before any real users.        |
| No CAPTCHA on sign-up                                                   | Deferred. Supabase's own rate limits apply. Revisit if abused.    |
| CSP allows inline scripts                                               | A nonce forces dynamic rendering on every page. Revisit later.    |
| `picomatch` ReDoS advisory, reached only through `@sentry/nextjs` build | Build-time dependency, not in the running app. Watch for a patch. |
| Free-tier hosting: Render cold starts, Supabase pause                   | Mitigated by the keep-awake workflow; a paid plan removes it.     |
| Sign-up email comes from a personal Gmail account                       | Needs a domain. Change before launch.                             |
| No `LICENSE` file                                                       | Choose a licence deliberately; none has been added.               |

## What is left, in order

1. The owner steps above.
2. Playwright smoke tests for sign-in, a check, and account deletion against a test project.
3. Usability pass with a few real people on real phones, then re-measure label coverage
   (last measured 69.3 %) against a fresh sample.
4. Move auth email to a domain sender.
5. Make the CSP enforcing, then consider nonces.
