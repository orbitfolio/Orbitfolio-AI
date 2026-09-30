'use client';

/**
 * Three-state theme toggle (Part B5): System / Light / Dark.
 * Compact icon segmented control for the AppShell header.
 */
import type { ReactElement } from 'react';
import { useThemeStore } from '@/lib/theme-store';
import type { ThemeChoice } from '@/lib/theme';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" strokeLinecap="round" />
    </svg>
  );
}

const OPTIONS: { value: ThemeChoice; label: string; Icon: () => ReactElement }[] = [
  { value: 'system', label: 'Follow system theme', Icon: SystemIcon },
  { value: 'light', label: 'Light theme', Icon: SunIcon },
  { value: 'dark', label: 'Dark theme', Icon: MoonIcon },
];

export default function ThemeToggle() {
  const choice = useThemeStore((s) => s.choice);
  const setChoice = useThemeStore((s) => s.setChoice);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-line/10 bg-line/[0.04] p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          onClick={() => setChoice(value)}
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            choice === value ? 'bg-accent/15 text-accent-bright' : 'text-ink-muted hover:text-ink-secondary'
          }`}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
