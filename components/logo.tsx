// Original PDF World logo mark: a globe (the "World") with a small PDF
// document badge. Drawn from scratch for this project — not copied from
// any existing logo. Used in the header and footer; the standalone favicon
// version lives in app/icon.svg.

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="PDF World logo"
    >
      <defs>
        <linearGradient id="pw-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="55%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#0b4f4a" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#pw-tile)" />
      {/* Globe: line-art world */}
      <g fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="29" cy="29" r="16" />
        <ellipse cx="29" cy="29" rx="7.5" ry="16" />
        <path d="M13 29h32" />
        <path d="M17.5 21.5c7 3.5 16 3.5 23 0" />
        <path d="M17.5 36.5c7-3.5 16-3.5 23 0" />
      </g>
      {/* PDF document badge, bottom-right */}
      <g>
        <rect x="39" y="39" width="21" height="21" rx="5.5" fill="#ffffff" />
        <path d="M54 39h1.5a5.5 5.5 0 0 1 5.5 5.5V46h-7z" fill="#ccfbf1" />
        <text
          x="49.5"
          y="54.5"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="7.5"
          fontWeight="800"
          fill="#0f766e"
        >
          PDF
        </text>
      </g>
    </svg>
  );
}

export function Logo({
  className = "h-9 w-9",
  wordmarkClassName = "font-display text-[1.45rem] font-bold leading-none tracking-tight text-slate-900",
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className={className} />
      <span className={wordmarkClassName}>PDF World</span>
    </span>
  );
}
