'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SkinType, SunExposure } from '@allergy-checker/shared';

/**
 * The skin profile, held locally and never sent anywhere but the analysis request.
 *
 * Deliberately not behind an account: someone in a shop with a bottle in their hand will
 * not sign up first, and the analysis needs nothing we would have to store to work.
 */
interface ProfileState {
  skinType: SkinType | null;
  sunExposure: SunExposure | null;
  declaredAllergies: string[];
  setSkinType: (skinType: SkinType | null) => void;
  setSunExposure: (sunExposure: SunExposure | null) => void;
  addAllergy: (name: string) => void;
  removeAllergy: (name: string) => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      skinType: null,
      sunExposure: null,
      declaredAllergies: [],
      setSkinType: (skinType) => set({ skinType }),
      setSunExposure: (sunExposure) => set({ sunExposure }),
      addAllergy: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const exists = state.declaredAllergies.some(
            (a) => a.toLowerCase() === trimmed.toLowerCase(),
          );
          return exists ? state : { declaredAllergies: [...state.declaredAllergies, trimmed] };
        }),
      removeAllergy: (name) =>
        set((state) => ({
          declaredAllergies: state.declaredAllergies.filter((a) => a !== name),
        })),
    }),
    { name: 'angalia-profile' },
  ),
);
