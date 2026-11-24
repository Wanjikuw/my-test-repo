'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SensitivityIssue, SkinType, SunExposure } from '@allergy-checker/shared';
import { PROFILE_STORAGE_KEY } from './profile-storage';

/**
 * The skin profile, held on this device and sent only inside an analysis request.
 *
 * Deliberately not behind an account: someone in a shop with a bottle in their hand will
 * not sign up first, and the analysis needs nothing we would have to store to work. A signed-in
 * person can choose to keep a copy in their account too (see `profile-sync.ts`); `syncedAt` and
 * `dirty` record where that stands and are never sent to the analysis.
 */
interface ProfileState {
  skinType: SkinType | null;
  sensitivityIssues: SensitivityIssue[];
  sunExposure: SunExposure | null;
  declaredAllergies: string[];
  /** The account copy this device last agreed with. Null when it has no account copy. */
  syncedAt: string | null;
  /** Changed on this device since `syncedAt`. */
  dirty: boolean;
  setSkinType: (skinType: SkinType | null) => void;
  setSensitivityIssues: (issues: SensitivityIssue[]) => void;
  toggleSensitivityIssue: (issue: SensitivityIssue) => void;
  applyQuizResult: (result: { skinType: SkinType | null; issues: SensitivityIssue[] }) => void;
  setSunExposure: (sunExposure: SunExposure | null) => void;
  addAllergy: (name: string) => void;
  removeAllergy: (name: string) => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      skinType: null,
      sensitivityIssues: [],
      sunExposure: null,
      declaredAllergies: [],
      syncedAt: null,
      dirty: false,
      setSkinType: (skinType) => set({ skinType, dirty: true }),
      setSensitivityIssues: (sensitivityIssues) => set({ sensitivityIssues, dirty: true }),
      toggleSensitivityIssue: (issue) =>
        set((state) => ({
          sensitivityIssues: state.sensitivityIssues.includes(issue)
            ? state.sensitivityIssues.filter((i) => i !== issue)
            : [...state.sensitivityIssues, issue],
          dirty: true,
        })),
      applyQuizResult: ({ skinType, issues }) =>
        set({ skinType, sensitivityIssues: issues, dirty: true }),
      setSunExposure: (sunExposure) => set({ sunExposure, dirty: true }),
      addAllergy: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const exists = state.declaredAllergies.some(
            (a) => a.toLowerCase() === trimmed.toLowerCase(),
          );
          return exists
            ? state
            : { declaredAllergies: [...state.declaredAllergies, trimmed], dirty: true };
        }),
      removeAllergy: (name) =>
        set((state) => ({
          declaredAllergies: state.declaredAllergies.filter((a) => a !== name),
          dirty: true,
        })),
    }),
    { name: PROFILE_STORAGE_KEY },
  ),
);
