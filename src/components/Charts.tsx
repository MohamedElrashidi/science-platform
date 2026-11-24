// رسوم بيانية بـ SVG/CSS بلا مكتبات. تعرض بيانات حقيقية فقط، وحالة فارغة عند غيابها.

export function Empty({ text }: { text: string }) {
  return <div className="empty"><div className="empty-dot" /><p>{text}</p></div>;
}

export function WeeklyBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.every((d) => d.value === 0)) return <Empty text="لا توجد محاولات مسلّمة في آخر 8 أسابيع. ستظهر هنا بمجرد أن يحل الطلاب." />;
  const W = 480, H = 210, padB = 34, padT = 24, bw = 34, gap = (W - data.length * bw) / (data.length + 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="عدد المحاولات المسلّمة أسبوعياً" style={{ width: "100%", height: "auto" }}>
      <line x1="0" x2={W} y1={H - padB} y2={H - padB} style={{ stroke: "var(--line)" }} />
      {data.map((d, i) => {
        const h = (d.value / max) * (H - padB - padT);
        const x = gap + i * (bw + gap);
        const last = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={H - padB - h} width={bw} height={Math.max(h, d.value ? 3 : 0)} rx="7" style={{ fill: last ? "var(--amber)" : "var(--teal)" }} />
            {d.value > 0 && <text x={x + bw / 2} y={H - padB - h - 7} textAnchor="middle" fontSize="12" fontWeight="700" style={{ fill: "var(--ink)" }}>{d.value}</text>}
            <text x={x + bw / 2} y={H - 12} textAnchor="middle" fontSize="11" style={{ fill: "var(--muted)" }}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function ExamBars({ data }: { data: { title: string; avg: number; n: number }[] }) {
  if (!data.length) return <Empty text="لا توجد نتائج مصحّحة بعد. تظهر هنا متوسطات الامتحانات بعد تسليم الطلاب." />;
  return (
    <div className="hbars">
      {data.map((d, i) => (
        <div key={i} className="hrow">
          <div className="hrow-t"><span>{d.title}</span><b>{Math.round(d.avg)}%</b></div>
          <div className="hbar"><i style={{ width: `${Math.max(2, Math.min(100, d.avg))}%`, background: d.avg >= 85 ? "var(--teal)" : d.avg >= 60 ? "#6FB7AE" : "var(--amber)" }} /></div>
          <div className="hrow-n">{d.n} محاولة</div>
        </div>
      ))}
    </div>
  );
}
