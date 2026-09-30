/**
 * Shared surface primitives (Phase 3, Part B4).
 *
 * These replace the copy-pasted `rounded-2xl border border-white/[0.08]
 * bg-[#101827] p-4` card pattern. All colors come from the semantic token
 * layer, so a future light theme only needs new variable values.
 */
import type { HTMLAttributes, ReactNode } from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

function padClass(padding: CardPadding): string {
  switch (padding) {
    case 'none':
      return '';
    case 'sm':
      return 'p-3';
    case 'lg':
      return 'p-6';
    default:
      return 'p-4';
  }
}

export function cardClass(padding: CardPadding = 'md', extra = ''): string {
  return `rounded-2xl border border-line/[0.08] bg-card ${padClass(padding)}${extra ? ` ${extra}` : ''}`;
}

export default function Card({
  children,
  className = '',
  padding = 'md',
  ...rest
}: {
  children?: ReactNode;
  className?: string;
  padding?: CardPadding;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${cardClass(padding)}${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </div>
  );
}
