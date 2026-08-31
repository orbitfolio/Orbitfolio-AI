export default function OrbitMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle cx="32" cy="32" r="22" stroke="#2DD4BF" strokeWidth="3" opacity="0.35" />
      <circle cx="32" cy="32" r="14" stroke="#2DD4BF" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="5" fill="#2DD4BF" />
      <circle cx="50" cy="18" r="4" fill="#94A3B8" />
      <path d="M50 18 A26 26 0 0 1 54 32" stroke="#64748B" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
