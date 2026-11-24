"use client";
export default function PrintBar({ count }: { count: number }) {
  return (
    <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", gap: 10, alignItems: "center", justifyContent: "center", padding: 10, background: "#fff", borderBottom: "1px solid #dde" }}>
      <button onClick={() => window.print()}>طباعة / حفظ PDF</button>
      <span>عدد الشهادات: {count}</span>
    </div>
  );
}
