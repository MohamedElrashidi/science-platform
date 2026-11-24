// رسم ذرة/جزيء زخرفي خفيف (لا يتفاعل مع القراءة)
export default function AtomArt({ size = 220, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.6" opacity=".9">
        <ellipse cx="110" cy="110" rx="92" ry="34" />
        <ellipse cx="110" cy="110" rx="92" ry="34" transform="rotate(60 110 110)" />
        <ellipse cx="110" cy="110" rx="92" ry="34" transform="rotate(120 110 110)" />
      </g>
      <circle cx="110" cy="110" r="12" fill="currentColor" />
      <g fill="currentColor">
        <circle cx="202" cy="110" r="6" />
        <circle cx="64" cy="190" r="6" />
        <circle cx="64" cy="30" r="6" />
      </g>
    </svg>
  );
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="#176B70" />
      <g stroke="#DDF3EF" strokeWidth="2">
        <ellipse cx="24" cy="24" rx="15" ry="6" />
        <ellipse cx="24" cy="24" rx="15" ry="6" transform="rotate(60 24 24)" />
        <ellipse cx="24" cy="24" rx="15" ry="6" transform="rotate(120 24 24)" />
      </g>
      <circle cx="24" cy="24" r="3.4" fill="#F4B66A" />
    </svg>
  );
}
