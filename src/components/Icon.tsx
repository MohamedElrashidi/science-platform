// أيقونات خطية بسيطة (24×24). بلا مكتبات خارجية.
const P: Record<string, string[]> = {
  home: ["M3 11l9-8 9 8", "M5 10v10h14V10"],
  users: ["M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6", "M17 14.5c2.7.3 4.5 2.3 4.5 5.5"],
  cap: ["M2 9l10-5 10 5-10 5z", "M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"],
  exam: ["M5 5h14v16H5z", "M9 4h6v3H9z", "M9 14l2 2 4-4"],
  file: ["M7 3h7l5 5v13H7z", "M14 3v5h5"],
  spark: ["M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"],
  bank: ["M4 6c0-1.5 3.6-3 8-3s8 1.5 8 3-3.6 3-8 3-8-1.5-8-3z", "M4 6v6c0 1.5 3.6 3 8 3s8-1.5 8-3V6", "M4 12v6c0 1.5 3.6 3 8 3s8-1.5 8-3v-6"],
  chart: ["M4 4v16h16", "M8 16v-5M12 16V8M16 16v-8"],
  settings: ["M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"],
  upload: ["M12 16V4M7 9l5-5 5 5", "M4 20h16"],
  book: ["M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z", "M4 19V5"],
  shield: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"],
  menu: ["M4 6h16M4 12h16M4 18h16"],
  close: ["M6 6l12 12M18 6L6 18"],
  logout: ["M9 4H5v16h4", "M16 8l4 4-4 4M20 12H9"],
  plus: ["M12 5v14M5 12h14"],
  trend: ["M3 17l6-6 4 4 8-9", "M15 6h6v6"],
  check: ["M5 12l5 5 9-10"],
  layers: ["M12 3l9 5-9 5-9-5z", "M3 13l9 5 9-5"],
};

export default function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths = P[name] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "users" && <><circle cx="9" cy="8" r="3.5" /><circle cx="17.5" cy="9" r="2.5" /></>}
      {name === "settings" && <circle cx="12" cy="12" r="3.2" />}
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
