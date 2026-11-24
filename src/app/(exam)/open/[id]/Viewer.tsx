"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Viewer({ r, student }: { r: any; student: boolean }) {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!student) return;
    const h = (e: MessageEvent) => {
      const d = e.data;
      if (d && d.type === "score" && Number.isFinite(d.score) && Number.isFinite(d.max))
        fetch(`/api/resources/${r.id}/result`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score: d.score, max: d.max }) })
          .then((x) => setMsg(x.ok ? "تم حفظ نتيجتك" : "تعذر حفظ النتيجة"));
    };
    window.addEventListener("message", h); return () => window.removeEventListener("message", h);
  }, [r.id, student]);
  const src = `/api/resources/${r.id}/file`, ext = (r.filename || "").split(".").pop()?.toLowerCase() || "";
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <div className="ex-top" style={{ position: "static" }}>
        <div className="ex-title"><strong>{r.title}</strong>{msg && <span className="badge g">{msg}</span>}</div>
        <Link href={student ? "/dashboard" : r.kind === "activity" ? "/activities" : "/worksheets"} className="badge" style={{ textDecoration: "none" }}>رجوع</Link>
      </div>
      {r.source === "link" ? (
        <div className="center"><div className="card" style={{ textAlign: "center" }}><p>هذا المحتوى على موقع خارجي.</p><a className="btn" href={r.external_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "inline-block" }}>فتح الرابط</a></div></div>
      ) : r.source === "html" ? (
        <iframe title={r.title} src={src} sandbox="allow-scripts allow-forms" style={{ flex: 1, border: 0, background: "#fff" }} />
      ) : ["pdf", "png", "jpg", "jpeg", "webp", "gif", "mp4", "mp3"].includes(ext) ? (
        <iframe title={r.title} src={src} style={{ flex: 1, border: 0, background: "#fff" }} />
      ) : (
        <div className="center"><div className="card" style={{ textAlign: "center" }}><p>{r.filename}</p><a className="btn" href={src} style={{ textDecoration: "none", display: "inline-block" }}>تنزيل الملف</a></div></div>
      )}
    </div>
  );
}
