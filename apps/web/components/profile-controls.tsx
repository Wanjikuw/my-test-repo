'use client';

import {
  SENSITIVITY_ISSUES,
  SensitivityIssue,
  type SkinType,
  type SunExposure,
} from '@allergy-checker/shared';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useProfile } from '../lib/profile';
import { ProfileSync } from './profile-sync';

// Only someone who asks for the questions downloads them.
const SkinTypeQuiz = dynamic(() => import('./skin-type-quiz').then((m) => m.SkinTypeQuiz), {
  ssr: false,
});

const SKIN_TYPES: SkinType[] = ['normal', 'dry', 'oily', 'combination', 'sensitive'];

const SUN_EXPOSURE: { value: SunExposure; label: string }[] = [
  { value: 'expected', label: 'Worn in daylight' },
  { value: 'avoided', label: 'Not worn in daylight' },
];

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        selected
          ? 'border-ink bg-ink text-shell'
          : 'border-line bg-surface text-ink hover:border-muted'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Skin type, sun exposure and declared allergies.
 *
 * Every control can be left unset, and leaving sun exposure unset is not the same as
 * answering "no": rule 6 treats an unanswered question as exposure being possible, so
 * forgetting to ask cannot understate the risk. The wording says so rather than implying
 * a default.
 */
export function ProfileControls() {
  const {
    skinType,
    sensitivityIssues,
    sunExposure,
    declaredAllergies,
    setSkinType,
    toggleSensitivityIssue,
    setSunExposure,
    addAllergy,
    removeAllergy,
  } = useProfile();
  const [draft, setDraft] = useState('');
  const [quizOpen, setQuizOpen] = useState(false);

  const submitAllergy = () => {
    addAllergy(draft);
    setDraft('');
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-xs font-medium tracking-widest text-muted uppercase">
          Skin type
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {SKIN_TYPES.map((type) => (
            <Chip
              key={type}
              selected={skinType === type}
              onClick={() => setSkinType(skinType === type ? null : type)}
            >
              {type}
            </Chip>
          ))}
        </div>
        {!quizOpen && (
          <button
            type="button"
            onClick={() => setQuizOpen(true)}
            className="mt-3 text-sm text-muted underline underline-offset-4 hover:text-ink"
          >
            {skinType === null ? 'Not sure? Find my skin type' : 'Find my skin type again'}
          </button>
        )}
        {skinType === null && !quizOpen && (
          <p className="mt-2 text-xs text-muted">
            Unanswered. Without a skin type, skin-specific warnings cannot be given.
          </p>
        )}
      </fieldset>

      {quizOpen && <SkinTypeQuiz onClose={() => setQuizOpen(false)} />}

      {(skinType === 'sensitive' || sensitivityIssues.length > 0) && (
        <fieldset>
          <legend className="text-xs font-medium tracking-widest text-muted uppercase">
            What your skin reacts to
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {SensitivityIssue.options.map((issue) => (
              <Chip
                key={issue}
                selected={sensitivityIssues.includes(issue)}
                onClick={() => toggleSensitivityIssue(issue)}
              >
                {SENSITIVITY_ISSUES[issue].label}
              </Chip>
            ))}
          </div>
          {sensitivityIssues.length === 0 && (
            <p className="mt-2 text-xs text-muted">
              Choose what applies so the result can point to the ingredients that matter to you.
            </p>
          )}
        </fieldset>
      )}

      <fieldset>
        <legend className="text-xs font-medium tracking-widest text-muted uppercase">
          Sun exposure
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUN_EXPOSURE.map((option) => (
            <Chip
              key={option.value}
              selected={sunExposure === option.value}
              onClick={() => setSunExposure(sunExposure === option.value ? null : option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        {sunExposure === null && (
          <p className="mt-2 text-xs text-muted">
            Unanswered. Ingredients that react to sunlight will be flagged rather than assumed safe.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="text-xs font-medium tracking-widest text-muted uppercase">
          Known allergies
        </legend>
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitAllergy();
              }
            }}
            placeholder="Ingredient name"
            className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={submitAllergy}
            className="rounded-md border border-line px-4 py-2 text-sm hover:border-muted"
          >
            Add
          </button>
        </div>
        {declaredAllergies.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {declaredAllergies.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => removeAllergy(name)}
                  className="rounded-full border border-avoid/30 bg-avoid-wash px-3 py-1.5 text-sm text-avoid"
                >
                  {name} <span aria-hidden>&times;</span>
                  <span className="sr-only">Remove</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <ProfileSync />
    </div>
  );
}
