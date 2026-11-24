"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { convertExam, normalizeExam } from "@/lib/qtypes";

type Item = { file: string; json: any; title: string; count: number; errors: string[] };
type Res = { title: string; ok: boolean; skipped?: boolean; questions?: number; errors?: string[] };

export default function ImportPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res[]>([]);
  const [msg, setMsg] = useState("");
  const [imgs, setImgs] = useState<File[]>([]);

  const relOf = (f: File) => ((f as any).webkitRelativePath as string) || f.name;
  const findImg = (file: string) => imgs.find((f) => relOf(f).endsWith(file)) || imgs.find((f) => f.name === file.split("/").pop());
  const wanted = (j: any): string[] => {
    const n = normalizeExam(j);
    return (Array.isArray(n?.questions) ? n.questions : []).map((q: any) => q?.media?.file).filter((x: any) => typeof x === "string" && x);
  };

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; setRes([]); setMsg("");
    const out: Item[] = [];
    for (const f of files) {
      try {
        const j = JSON.parse((await f.text()).replace(/^﻿/, ""));
        const list = Array.isArray(j.exams) ? j.exams : [j];
        list.forEach((x: any, i: number) => {
          const c = convertExam(x), n = normalizeExam(x);
          out.push({ file: list.length > 1 ? `${f.name} (${i + 1})` : f.name, json: x, title: String(n?.title ?? "—"),
            count: Array.isArray(n?.questions) ? n.questions.length : 0, errors: "ok" in c ? [] : c.errors });
        });
      } catch { out.push({ file: f.name, json: null, title: "—", count: 0, errors: ["الملف ليس JSON صالحاً"] }); }
    }
    setItems(out);
  }

  const valid = items.filter((i) => !i.errors.length);

  function onImgs(e: React.ChangeEvent<HTMLInputElement>) {
    setImgs((old) => [...old, ...Array.from(e.target.files || [])]); e.target.value = "";
  }
  const needed = Array.from(new Set(valid.flatMap((v) => wanted(v.json))));
  const missing = needed.filter((f) => !findImg(f));

  async function go() {
    setBusy(true); setMsg("");
    try {
      // 1) رفع الصور المطلوبة ثم ربط كل سؤال برابط صورته
      const urls = new Map<string, string>();
      for (const file of needed) {
        const img = findImg(file); if (!img) continue;
        const fd = new FormData(); fd.append("file", img); fd.append("path", file);
        const rr = await fetch("/api/import/media", { method: "POST", body: fd });
        const jj = await rr.json().catch(() => ({}));
        if (!rr.ok) throw new Error(`${file}: ${jj.error || "تعذر رفع الصورة"}`);
        urls.set(file, jj.url);
      }
      const exams = valid.map((v) => {
        const j = JSON.parse(JSON.stringify(v.json));
        (Array.isArray(j.questions) ? j.questions : []).forEach((q: any) => {
          if (q?.media?.file && urls.has(q.media.file)) q.media.url = urls.get(q.media.file);
        });
        return j;
      });
      const r = await api<{ results: Res[] }>("/api/import", "POST", { exams });
      setRes(r.results); setItems([]); setImgs([]);
    } catch (x: any) { setMsg(x.message); }
    setBusy(false);
  }

  return (
    <div className="card">
      <h1>استيراد الامتحانات</h1>
      <p className="muted">ارفع ملف JSON واحداً أو أكثر. تدخل الأسئلة بحالة «بانتظار الاعتماد» والامتحان كمسودة، ولا يُنشر شيء تلقائياً.</p>
      <label>ملفات الامتحانات (JSON)</label>
      <input type="file" accept=".json,application/json" multiple onChange={onFiles} disabled={busy} />
      <label>صور الأسئلة (اختياري — اختر الصور أو مجلد الصور كاملاً)</label>
      <input type="file" accept="image/*" multiple onChange={onImgs} disabled={busy} />
      <input type="file" accept="image/*" multiple onChange={onImgs} disabled={busy} {...({ webkitdirectory: "" } as any)} style={{ marginTop: 6 }} />
      {imgs.length > 0 && <p className="muted">تم اختيار {imgs.length} صورة</p>}
      <p className="err">{msg}</p>

      {items.length > 0 && (
        <div className="tbl" style={{ marginTop: 10 }}><table>
          <thead><tr><th>الملف</th><th>العنوان</th><th>الأسئلة</th><th>الحالة</th></tr></thead>
          <tbody>{items.map((i, k) => (
            <tr key={k}><td dir="ltr">{i.file}</td><td>{i.title}</td><td>{i.count}</td>
              <td>{i.errors.length ? <span className="err">{i.errors.slice(0, 4).map((e, n) => <div key={n}>{e}</div>)}{i.errors.length > 4 && <div>… و{i.errors.length - 4} أخطاء أخرى</div>}</span> : <span className="ok">جاهز</span>}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      {valid.length > 0 && needed.length > 0 && (
        <p className={missing.length ? "err" : "ok"}>
          {missing.length ? `الأسئلة تحتاج ${needed.length} صورة، وينقص ${missing.length} (اختر مجلد الصور أعلاه). يمكنك الاستيراد الآن وستبقى هذه الأسئلة بلا صورة.`
            : `كل الصور (${needed.length}) جاهزة للرفع.`}
        </p>
      )}
      {valid.length > 0 && (
        <p><button disabled={busy} onClick={go}>{busy ? "جارٍ الاستيراد…" : `استيراد ${valid.length} امتحان`}</button>
          {valid.length < items.length && <span className="muted"> — الملفات التي بها أخطاء لن تُستورد</span>}</p>
      )}

      {res.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {res.map((r, i) => (
            <p key={i} className={r.ok ? "ok" : "err"}>
              {r.ok ? `✓ ${r.title}: ${r.questions} سؤال` : `✗ ${r.title}: ${(r.errors || []).join("، ")}`}
            </p>
          ))}
          <a href="/exams">الذهاب إلى الامتحانات لاعتمادها ونشرها</a>
        </div>
      )}
    </div>
  );
}
