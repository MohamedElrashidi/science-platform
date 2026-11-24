"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Empty } from "@/components/Charts";
import { createClient } from "@/lib/supabase/client";

export default function ResourceManager({ kind, title, hint }: { kind: "worksheet" | "activity" | "video"; title: string; hint: string }) {
  const [list, setList] = useState<any[] | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const [cls, setCls] = useState<Record<number, string>>({});
  const load = () => api<any[]>("/api/resources?kind=" + kind).then(setList).catch((e) => setMsg(e.message));
  useEffect(() => { load(); api<any[]>("/api/classes").then(setClasses).catch(() => {}); }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg("");
    const form = e.currentTarget, fd = new FormData(form); fd.append("kind", kind);
    const f = fd.get("file");
    if (f instanceof File && f.size > 4 * 1024 * 1024) {   // ملف كبير: رفع مباشر إلى التخزين
      try {
        const u = await api<{ path: string; token: string }>("/api/resources/upload-url", "POST", { filename: f.name, size: f.size });
        const up = await createClient().storage.from("content").uploadToSignedUrl(u.path, u.token, f);
        if (up.error) throw new Error("تعذر رفع الملف");
        fd.delete("file"); fd.append("storage_path", u.path); fd.append("filename", f.name); fd.append("size", String(f.size));
      } catch (x: any) { setBusy(false); setMsg(x.message); return; }
    }
    const r = await fetch("/api/resources", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(j.error || "حدث خطأ"); return; }
    form.reset(); load();
  }
  async function act(id: number, body: object) { setMsg(""); try { await api("/api/resources/" + id, "POST", body); load(); } catch (x: any) { setMsg(x.message); } }
  async function del(id: number) { if (!confirm("حذف نهائي؟")) return; try { await api("/api/resources/" + id, "DELETE"); load(); } catch (x: any) { setMsg(x.message); } }

  return (
    <>
      <div className="card">
        <h1>{title}</h1>
        <p className="muted">{hint}</p>
        <form onSubmit={add}>
          <div className="row">
            <div style={{ flex: "2 1 240px" }}><label>العنوان</label><input name="title" required maxLength={200} /></div>
            <div><label>المرحلة / الصف الدراسي (اختياري)</label><input name="grade_level" placeholder="مثال: 8" /></div>
          </div>
          <div className="row">
            <div><label>ملف (حتى 50 ميغابايت)</label><input type="file" name="file" accept={kind === "video" ? ".mp4,.webm" : ".pdf,.html,.htm,.png,.jpg,.jpeg,.webp,.gif,.docx,.pptx,.xlsx,.mp4,.webm,.mp3"} /></div>
            <div><label>{kind === "video" ? "أو رابط YouTube / Drive (الأفضل للفيديوهات الطويلة)" : "أو رابط (Drive / YouTube …)"}</label><input name="link" dir="ltr" placeholder="https://" /></div>
            <button disabled={busy}>{busy ? "جارٍ الرفع… (لا تغلق الصفحة)" : "إضافة"}</button>
          </div>
        </form>
        <p className="err">{msg}</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {list === null ? <div className="skeleton" style={{ height: 90 }} /> : !list.length ? <Empty text="لا يوجد شيء بعد. أضف أول ملف من الأعلى." /> :
          list.map((r) => (
            <div key={r.id} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
              <div className="row" style={{ alignItems: "center" }}>
                <div style={{ flex: "3 1 240px" }}><b>{r.title}</b><div className="muted">{r.source === "link" ? "رابط خارجي" : r.source === "html" ? "صفحة تفاعلية (HTML)" : r.filename}</div></div>
                <span className={"badge " + (r.status === "published" ? "g" : "")}>{r.status === "published" ? "منشور" : "مسودة"}</span>
                {r.status === "published" ? <button className="ghost" onClick={() => act(r.id, { action: "unpublish" })}>إلغاء النشر</button> : <button onClick={() => act(r.id, { action: "publish" })}>نشر</button>}
                <button className="ghost" onClick={() => del(r.id)}>حذف</button>
              </div>
              <div className="row" style={{ marginTop: 6, alignItems: "center" }}>
                <select value={cls[r.id] || ""} onChange={(e) => setCls({ ...cls, [r.id]: e.target.value })} aria-label="الصف"><option value="">إسناد إلى صف…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <button className="ghost" disabled={!cls[r.id]} onClick={() => act(r.id, { action: "assign", class_id: Number(cls[r.id]) })}>إسناد</button>
              </div>
              {r.assignments.map((a: any) => <span key={a.id} className="badge" style={{ marginInlineEnd: 6 }}>{a.name} <a href="#" onClick={(e) => { e.preventDefault(); act(r.id, { action: "unassign", assignment_id: a.id }); }}>×</a></span>)}
              {r.status === "published" && !r.assignments.length && <p className="muted">منشور لكن غير مسند لأي صف، فلن يراه الطلاب.</p>}
            </div>))}
      </div>
    </>
  );
}
