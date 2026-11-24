"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { convertExam } from "@/lib/qtypes";

type Item = { file: string; json: any; title: string; count: number; errors: string[] };
type Res = { title: string; ok: boolean; skipped?: boolean; questions?: number; errors?: string[] };

export default function ImportPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res[]>([]);
  const [msg, setMsg] = useState("");

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; setRes([]); setMsg("");
    const out: Item[] = [];
    for (const f of files) {
      try {
        const j = JSON.parse((await f.text()).replace(/^﻿/, ""));
        const list = Array.isArray(j.exams) ? j.exams : [j];
        list.forEach((x: any, i: number) => {
          const c = convertExam(x);
          out.push({ file: list.length > 1 ? `${f.name} (${i + 1})` : f.name, json: x, title: String(x?.title ?? "—"),
            count: Array.isArray(x?.questions) ? x.questions.length : 0, errors: "ok" in c ? [] : c.errors });
        });
      } catch { out.push({ file: f.name, json: null, title: "—", count: 0, errors: ["الملف ليس JSON صالحاً"] }); }
    }
    setItems(out);
  }

  const valid = items.filter((i) => !i.errors.length);

  async function go() {
    setBusy(true); setMsg("");
    try {
      const r = await api<{ results: Res[] }>("/api/import", "POST", { exams: valid.map((v) => v.json) });
      setRes(r.results); setItems([]);
    } catch (x: any) { setMsg(x.message); }
    setBusy(false);
  }

  return (
    <div className="card">
      <h1>استيراد الامتحانات</h1>
      <p className="muted">ارفع ملف JSON واحداً أو أكثر. تدخل الأسئلة بحالة «بانتظار الاعتماد» والامتحان كمسودة، ولا يُنشر شيء تلقائياً.</p>
      <input type="file" accept=".json,application/json" multiple onChange={onFiles} disabled={busy} />
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
