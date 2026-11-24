'use client';

import {
  inferSkinType,
  QUIZ,
  SENSITIVITY_ISSUES,
  type QuizResult,
  type SkinType,
} from '@allergy-checker/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useProfile } from '../lib/profile';

const TYPE_BLURB: Record<SkinType, string> = {
  dry: 'Skin that runs short of oil and water, and tends to feel tight or flaky.',
  oily: 'Skin that makes plenty of oil, shiny across the face, with more visible pores.',
  combination: 'Oilier on the forehead, nose and chin, comfortable or drier elsewhere.',
  sensitive: 'Skin that reacts readily. The reactions you reported are listed below.',
  normal: 'Skin that is balanced: neither often tight nor often shiny.',
};

function Outcome({
  result,
  onUse,
}: {
  result: QuizResult;
  onUse: (type: SkinType | null) => void;
}) {
  const { skinType, baseType, issues, runnerUp, confidence } = result;

  if (skinType === null) {
    return (
      <div>
        <p className="font-serif text-xl">Not enough to tell</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Those answers did not point to one skin type. You can go back and answer more, or choose a
          type yourself.
        </p>
        {issues.length > 0 && <Issues issues={issues} />}
        {issues.length > 0 && (
          <button
            type="button"
            onClick={() => onUse(null)}
            className="mt-4 rounded-md border border-line px-4 py-2 text-sm hover:border-muted"
          >
            Keep the reactions I reported
          </button>
        )}
      </div>
    );
  }

  const choices: SkinType[] =
    confidence === 'close' && runnerUp ? [skinType, runnerUp] : [skinType];

  return (
    <div>
      <p className="text-xs font-medium tracking-widest text-muted uppercase">
        {confidence === 'close' ? 'Closest matches' : 'Your result'}
      </p>
      <p className="mt-2 font-serif text-2xl capitalize">{choices.join(' or ')}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{TYPE_BLURB[skinType]}</p>
      {skinType === 'sensitive' && baseType && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Underneath, your skin leans {baseType}.
        </p>
      )}
      {confidence === 'close' && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This was a close call. Choose the one that sounds more like you.
        </p>
      )}
      {issues.length > 0 && <Issues issues={issues} />}

      <div className="mt-5 flex flex-wrap gap-2">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => onUse(choice)}
            className="rounded-md bg-ink px-5 py-2.5 text-sm text-shell"
          >
            Use {choice}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        This is cosmetic guidance from a few questions, not a diagnosis. See a doctor for a skin
        condition.
      </p>
    </div>
  );
}

function Issues({ issues }: { issues: QuizResult['issues'] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium tracking-widest text-muted uppercase">
        What your skin reacts to
      </p>
      <ul className="mt-2 space-y-2">
        {issues.map((issue) => (
          <li key={issue} className="text-sm leading-relaxed">
            <span className="font-medium">{SENSITIVITY_ISSUES[issue].label}.</span>{' '}
            <span className="text-muted">{SENSITIVITY_ISSUES[issue].description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A short questionnaire. It is scored here, in the browser, and the answers are never kept. */
export function SkinTypeQuiz({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const applyQuizResult = useProfile((state) => state.applyQuizResult);
  const heading = useRef<HTMLLegendElement>(null);
  const done = step >= QUIZ.length;
  const question = QUIZ[step];
  const result = useMemo(() => inferSkinType(answers), [answers]);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  function choose(id: string, option: string) {
    setAnswers((current) => ({ ...current, [id]: option }));
  }

  function skip(id: string) {
    setAnswers((current) => Object.fromEntries(Object.entries(current).filter(([k]) => k !== id)));
    setStep((s) => s + 1);
  }

  function use(type: SkinType | null) {
    applyQuizResult({ skinType: type ?? useProfile.getState().skinType, issues: result.issues });
    onClose();
  }

  return (
    <section
      aria-label="Find my skin type"
      className="rounded-md border border-line bg-surface p-5 sm:p-6"
    >
      {done || !question ? (
        <>
          <Outcome result={result} onUse={use} />
          <div className="mt-5 flex gap-4 text-sm text-muted">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="underline underline-offset-4 hover:text-ink"
            >
              Start again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="underline underline-offset-4 hover:text-ink"
            >
              Close
            </button>
          </div>
        </>
      ) : (
        <fieldset>
          <p className="text-xs text-muted">
            Question {step + 1} of {QUIZ.length}
          </p>
          <legend
            ref={heading}
            tabIndex={-1}
            className="mt-2 font-serif text-xl leading-snug outline-none"
          >
            {question.prompt}
          </legend>
          <div className="mt-4 space-y-2">
            {question.options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-4 py-3 text-sm has-[:checked]:border-ink has-[:checked]:bg-shell"
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={answers[question.id] === option.id}
                  onChange={() => choose(question.id, option.id)}
                />
                {option.label}
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-md border border-line px-4 py-2 hover:border-muted"
              >
                Back
              </button>
            )}
            <button
              type="button"
              disabled={!answers[question.id]}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-md bg-ink px-5 py-2 text-shell disabled:opacity-40"
            >
              {step === QUIZ.length - 1 ? 'See result' : 'Next'}
            </button>
            <button
              type="button"
              onClick={() => skip(question.id)}
              className="text-muted underline underline-offset-4 hover:text-ink"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto text-muted underline underline-offset-4 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </fieldset>
      )}
    </section>
  );
}
