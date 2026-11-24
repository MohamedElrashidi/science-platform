// رسم خطي لتقدّم الطالب عبر الامتحانات (SVG خالص، يعمل في الصفحات الخادمية)
export default function ProgressChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <p className="muted">لا توجد نتائج مصححة بعد لرسم التقدم.</p>;
  const W = 640, H = 260, L = 38, R = 16, T = 16, B = 44;
  const iw = W - L - R, ih = H - T - B;
  const x = (i: number) => L + (data.length === 1 ? iw / 2 : (iw * i) / (data.length - 1));
  const y = (v: number) => T + ih * (1 - Math.max(0, Math.min(100, v)) / 100);
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${x(0)},${y(0)} ${pts} ${x(data.length - 1)},${y(0)}`;
  const short = (s: string) => (s.length > 11 ? s.slice(0, 10) + "…" : s);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="تقدم الطالب عبر الامتحانات" style={{ width: "100%", height: "auto", direction: "ltr" }}>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeDasharray={g === 50 ? "5 4" : undefined} />
          <text x={L - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--muted, #5E6E80)">{g}%</text>
        </g>))}
      {data.length > 1 && <polygon points={area} fill="var(--teal)" opacity="0.10" />}
      {data.length > 1 && <polyline points={pts} fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="5" fill={d.value < 50 ? "var(--amber, #F4B66A)" : "var(--teal)"} stroke="#fff" strokeWidth="2" />
          <text x={x(i)} y={y(d.value) - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">{Math.round(d.value)}%</text>
          <text x={x(i)} y={H - 22} textAnchor="middle" fontSize="11" fill="var(--muted, #5E6E80)">{short(d.label)}</text>
        </g>))}
    </svg>
  );
}
