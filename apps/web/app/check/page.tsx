'use client';

import type { AnalyzeResponse } from '@allergy-checker/shared';
import { useState } from 'react';
import { analyze, ApiError } from '../../lib/api';
import { annotate } from '../../lib/annotate';
import { addIngredient } from '../../lib/label';
import { useProfile } from '../../lib/profile';
import { ProfileControls } from '../../components/profile-controls';
import { Verdict } from '../../components/verdict';
import { IngredientRow } from '../../components/ingredient-row';
import { LabelCapture } from '../../components/label-capture';
import { IngredientSearch } from '../../components/ingredient-search';

export default function CheckPage() {
  const { skinType, sunExposure, declaredAllergies } = useProfile();
  const [label, setLabel] = useState('');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  // The label that produced `result`, so the annotated list cannot reorder itself against
  // text the user has since edited.
  const [analysed, setAnalysed] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // The name of a pick already on the label, so refusing it is visible rather than silent.
  const [duplicate, setDuplicate] = useState<string | null>(null);

  function addPicked(inciName: string) {
    const outcome = addIngredient(label, inciName);
    setLabel(outcome.label);
    setDuplicate(outcome.added ? null : inciName);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await analyze({ label, skinType, sunExposure, declaredAllergies });
      setResult(response);
      setAnalysed(label);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Something went wrong.');
      setResult(null);
    } finally {
      setPending(false);
    }
  }

  const names = result ? annotate(analysed, result) : [];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <h1 className="font-serif text-3xl">Check a label</h1>
      <p className="mt-2 text-muted">
        Paste the ingredient list exactly as it is printed on the packaging, or photograph it.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6">
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
            <LabelCapture onText={setLabel} />
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

          <h2 className="mt-10 font-serif text-2xl">The label, as read</h2>
          <p className="mt-1 text-sm text-muted">
            In the order printed. Checked against {result.corpus.ingredientCount.toLocaleString()}{' '}
            reference ingredients.
          </p>
          <ul className="mt-5 divide-y divide-line">
            {names.map((name, i) => (
              <IngredientRow key={`${name.printed}-${i}`} name={name} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
