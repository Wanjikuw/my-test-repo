'use client';

import type { AnalyzeResponse, Capabilities } from '@allergy-checker/shared';
import { useEffect, useState } from 'react';
import { analyze, ApiError, getCapabilities, NO_CAPABILITIES } from '../../lib/api';
import { annotate } from '../../lib/annotate';
import { addIngredient, replaceName } from '../../lib/label';
import { useProfile } from '../../lib/profile';
import { ProfileControls } from '../../components/profile-controls';
import { Verdict } from '../../components/verdict';
import { IngredientRow } from '../../components/ingredient-row';
import { LabelCapture } from '../../components/label-capture';
import { IngredientSearch } from '../../components/ingredient-search';
import { ModelNotes } from '../../components/model-notes';

function listed(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export default function CheckPage() {
  const { skinType, sunExposure, declaredAllergies } = useProfile();
  const [label, setLabel] = useState('');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // The name of a pick already on the label, so refusing it is visible rather than silent.
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities>(NO_CAPABILITIES);

  useEffect(() => {
    const controller = new AbortController();
    getCapabilities(controller.signal).then(setCapabilities, () => undefined);
    return () => controller.abort();
  }, []);

  function addPicked(inciName: string) {
    const outcome = addIngredient(label, inciName);
    setLabel(outcome.label);
    setDuplicate(outcome.added ? null : inciName);
  }

  async function check(text: string) {
    setPending(true);
    setError(null);
    try {
      setResult(await analyze({ label: text, skinType, sunExposure, declaredAllergies }));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Something went wrong.');
      setResult(null);
    } finally {
      setPending(false);
    }
  }

  function substitute(printed: string, inciName: string) {
    const outcome = replaceName(label, printed, inciName);
    if (!outcome.replaced) {
      setError(`${printed} is no longer on the label as printed, so nothing was substituted.`);
      return;
    }
    setLabel(outcome.label);
    void check(outcome.label);
  }

  const names = result ? annotate(result) : [];
  const unresolved = result?.profile.unresolvedAllergies ?? [];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <h1 className="font-serif text-3xl">Check a label</h1>
      <p className="mt-2 text-muted">
        Paste the ingredient list exactly as it is printed on the packaging, or read it with the
        camera.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void check(label);
        }}
        className="mt-8 space-y-6"
      >
        <ProfileControls />

        <div>
          <label
            htmlFor="label"
            className="text-xs font-medium tracking-widest text-muted uppercase"
          >
            Ingredient list
          </label>
          <textarea
            id="label"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setDuplicate(null);
            }}
            rows={6}
            placeholder="Aqua, Glycerin, Linalool, Limonene…"
            className="label-quote mt-3 w-full rounded-md border border-line bg-surface p-4 text-sm outline-none focus:border-ink"
          />
          <div className="mt-3">
            <LabelCapture onText={setLabel} capabilities={capabilities} />
          </div>
        </div>

        <div>
          <IngredientSearch onSelect={addPicked} />
          {duplicate && (
            <p className="mt-2 text-xs text-muted">{duplicate} is already on this label.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending || label.trim().length === 0}
          className="rounded-md bg-ink px-6 py-3 text-sm text-shell disabled:opacity-40"
        >
          {pending ? 'Checking…' : 'Check this label'}
        </button>
      </form>

      {error && (
        <p className="mt-6 rounded-md border border-avoid/30 bg-avoid-wash p-4 text-sm text-avoid">
          {error}
        </p>
      )}

      {result && (
        <section className="mt-12">
          <Verdict result={result} />

          {unresolved.length > 0 && (
            <p className="mt-4 rounded-md border border-line bg-unread-wash p-4 text-sm leading-relaxed text-unread">
              {listed(unresolved)} {unresolved.length === 1 ? 'is' : 'are'} on your allergy list but
              not in the reference data, so {unresolved.length === 1 ? 'it' : 'they'} could not be
              matched against this label. Declare the INCI name printed on packaging instead.
            </p>
          )}

          <h2 className="mt-10 font-serif text-2xl">The label, as read</h2>
          <p className="mt-1 text-sm text-muted">
            In the order printed. Checked against {result.corpus.ingredientCount.toLocaleString()}{' '}
            reference ingredients.
          </p>
          <ul className="mt-5 divide-y divide-line">
            {names.map((name) => (
              <IngredientRow key={`${name.position}-${name.printed}`} name={name} />
            ))}
          </ul>

          {capabilities.modelNotes && result.unmatched.length > 0 && (
            <ModelNotes
              unmatched={result.unmatched}
              model={capabilities.modelNotes.model}
              onSubstitute={substitute}
            />
          )}
        </section>
      )}
    </main>
  );
}
