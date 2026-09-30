'use client';

/**
 * React binding for the theme preference. The DOM application itself is done
 * by lib/theme.ts (and the pre-hydration no-flash script); this store only
 * holds the user's choice, persists it, and triggers applyTheme on change.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyTheme, resolveTheme, THEME_STORAGE_KEY, type ThemeChoice } from './theme';

interface ThemeState {
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
}

function resolved(choice: ThemeChoice): 'light' | 'dark' {
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true;
  return resolveTheme(choice, prefersDark);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      choice: 'system',
      setChoice: (choice) => {
        applyTheme(resolved(choice));
        set({ choice });
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (state) => ({ choice: state.choice }),
    }
  )
);
