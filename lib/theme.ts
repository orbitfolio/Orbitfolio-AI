/**
 * Theme preference (Part B5). 'system' follows prefers-color-scheme.
 *
 * The stored preference lives under its own localStorage key so it can be
 * read synchronously before hydration (no flash). lib/theme-store.ts is the
 * React binding used by the toggle UIs.
 */

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'orbitfolio-theme-v1';

/** Resolve a stored choice against the OS preference. */
export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): 'light' | 'dark' {
  if (choice === 'system') return prefersDark ? 'dark' : 'light';
  return choice;
}

/** Apply a resolved theme to the document root. */
export function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', theme === 'dark' ? '#070B14' : '#F6F8FB'));
}

export const NO_FLASH_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var choice = stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = choice === 'system' ? (prefersDark ? 'dark' : 'light') : choice;
    var root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    root.dataset.theme = theme;
  } catch (e) {}
})();
`;
