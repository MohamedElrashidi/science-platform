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
  const [vurl, setVurl] = useState<string | null>(null);
  const ext0 = (r.filename || "").split(".").pop()?.toLowerCase() || "";
  const isVideo = ["mp4", "webm"].includes(ext0);
  useEffect(() => { if (isVideo) fetch(`/api/resources/${r.id}/file?mode=url`).then((x) => x.json()).then((j) => setVurl(j.url)).catch(() => {}); }, [r.id, isVideo]);
  const yt = r.source === "link" ? /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/.exec(r.external_url || "")?.[1] : null;
  const src = `/api/resources/${r.id}/file`, ext = (r.filename || "").split(".").pop()?.toLowerCase() || "";
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <div className="ex-top" style={{ position: "static" }}>
        <div className="ex-title"><strong>{r.title}</strong>{msg && <span className="badge g">{msg}</span>}</div>
        <Link href={student ? "/dashboard" : r.kind === "video" ? "/videos" : r.kind === "activity" ? "/activities" : "/worksheets"} className="badge" style={{ textDecoration: "none" }}>رجوع</Link>
      </div>
      {yt ? (
        <iframe title={r.title} src={`https://www.youtube-nocookie.com/embed/${yt}`} allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen style={{ flex: 1, border: 0, background: "#000" }} />
      ) : isVideo ? (
        <div style={{ flex: 1, background: "#000", display: "grid", placeItems: "center" }}>
          {vurl ? <video src={vurl} controls controlsList="nodownload" playsInline style={{ maxWidth: "100%", maxHeight: "100%" }} /> : <span style={{ color: "#fff" }}>جارٍ تحميل الفيديو…</span>}
        </div>
      ) : r.source === "link" ? (
        <div className="center"><div className="card" style={{ textAlign: "center" }}><p>هذا المحتوى على موقع خارجي.</p><a className="btn" href={r.external_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "inline-block" }}>فتح الرابط</a></div></div>
      ) : r.source === "html" ? (
        <iframe title={r.title} src={src} sandbox="allow-scripts allow-forms" style={{ flex: 1, border: 0, background: "var(--card)" }} />
      ) : ["pdf", "png", "jpg", "jpeg", "webp", "gif", "mp3"].includes(ext) ? (
        <iframe title={r.title} src={src} style={{ flex: 1, border: 0, background: "var(--card)" }} />
      ) : (
        <div className="center"><div className="card" style={{ textAlign: "center" }}><p>{r.filename}</p><a className="btn" href={src} style={{ textDecoration: "none", display: "inline-block" }}>تنزيل الملف</a></div></div>
      )}
    </div>
  );
}
