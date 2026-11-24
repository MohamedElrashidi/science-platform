"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { TYPE_LABELS } from "@/lib/qtypes";
import { Empty } from "@/components/Charts";

const ST: Record<string, string> = { approved: "معتمد", pending_review: "بانتظار الاعتماد" };

export default function Bank() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [f, setF] = useState({ q: "", status: "", qtype: "", subject_id: "" });
  const [sel, setSel] = useState<number[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const load = () => {
    const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
    api<any[]>("/api/questions?" + p).then((r) => { setRows(r); setSel([]); }).catch((e) => setMsg(e.message));
  };
  useEffect(() => { api<any>("/api/subjects").then((r) => setSubjects(r.subjects || [])).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [f]);

  async function bulk(status: string) {
    try { await api("/api/questions", "PATCH", { ids: sel, status }); load(); } catch (x: any) { setMsg(x.message); }
  }
  async function del(id: number) {
    if (!confirm("حذف هذا السؤال نهائيًا؟")) return;
    try { await api("/api/questions/" + id, "DELETE"); load(); } catch (x: any) { setMsg(x.message); }
  }
  const pending = (rows || []).filter((r) => r.status === "pending_review");

  return (
    <div className="card">
      <div className="sec"><h1 style={{ margin: 0 }}>بنك الأسئلة</h1><span className="badge">{rows?.length ?? "…"} سؤال</span></div>
      <div className="row">
        <div><label>بحث</label><input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="كلمة من نص السؤال" /></div>
        <div><label>المادة</label><select value={f.subject_id} onChange={(e) => setF({ ...f, subject_id: e.target.value })}><option value="">الكل</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label>النوع</label><select value={f.qtype} onChange={(e) => setF({ ...f, qtype: e.target.value })}><option value="">الكل</option>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label>الحالة</label><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">الكل</option><option value="approved">معتمد</option><option value="pending_review">بانتظار الاعتماد</option></select></div>
      </div>
      <p className="err">{msg}</p>
      <div className="row" style={{ margin: "6px 0" }}>
        <button className="ghost" onClick={() => setSel(sel.length === (rows || []).length ? [] : (rows || []).map((r) => r.id))}>{sel.length ? "إلغاء التحديد" : "تحديد الكل"}</button>
        {sel.length > 0 && <><button onClick={() => bulk("approved")}>اعتماد المحدد ({sel.length})</button><button className="ghost" onClick={() => bulk("pending_review")}>إرجاع للمراجعة</button></>}
        {sel.length === 0 && pending.length > 0 && <button onClick={() => { setSel(pending.map((r) => r.id)); }}>تحديد الأسئلة غير المعتمدة ({pending.length})</button>}
      </div>
      {rows === null ? <div className="skeleton" style={{ height: 100 }} /> : !rows.length ? <Empty text="لا توجد أسئلة مطابقة. استورد امتحانًا من صفحة الاستيراد." /> :
        rows.map((r) => (
          <div key={r.id} className="rv" style={{ padding: 12 }}>
            <div className="row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
              <input type="checkbox" style={{ width: 22, minHeight: 22, flex: "0 0 22px" }} checked={sel.includes(r.id)} onChange={() => setSel((s) => s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id])} aria-label="تحديد" />
              <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setOpen(open === r.id ? null : r.id)}>
                <div style={{ fontWeight: 700, whiteSpace: "pre-line" }}>{r.prompt.slice(0, 160)}{r.prompt.length > 160 ? "…" : ""}</div>
                <div className="muted" style={{ fontSize: ".85rem" }}>{TYPE_LABELS[r.qtype]} · {r.subjects?.name ?? "—"}{r.lessons?.title ? ` · ${r.lessons.title}` : ""} · {r.marks} درجة{r.media_url ? " · بصورة" : ""}</div>
              </div>
              <span className={"badge " + (r.status === "approved" ? "g" : "a")}>{ST[r.status]}</span>
            </div>
            {open === r.id && <div style={{ marginTop: 8 }}><Detail q={r} onDone={load} onDelete={() => del(r.id)} /></div>}
          </div>))}
    </div>
  );
}

function Detail({ q, onDone, onDelete }: { q: any; onDone: () => void; onDelete: () => void }) {
  const [prompt, setPrompt] = useState(q.prompt), [marks, setMarks] = useState(String(q.marks)), [err, setErr] = useState("");
  const d = q.data || {};
  const key = q.qtype === "mcq" ? (d.options || []).map((o: any) => ((d.correct || []).map(String).includes(String(o.id)) ? "✓ " : "• ") + o.text).join("\n")
    : q.qtype === "tf" ? (d.correct ? "صح" : "خطأ") : JSON.stringify(d.blanks || d.accepted || d.pairs || d.items || d.model_answer || "", null, 0);
  async function save(extra: object = {}) { try { await api("/api/questions/" + q.id, "PATCH", { prompt, marks, ...extra }); onDone(); } catch (x: any) { setErr(x.message); } }
  return (
    <div>
      <label>نص السؤال</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <p className="muted" style={{ marginBottom: 2 }}>الإجابة:</p><pre style={{ whiteSpace: "pre-wrap", margin: 0, font: "inherit" }}>{key}</pre>
      {q.explanation && <p className="muted">{q.explanation}</p>}
      <div className="row" style={{ marginTop: 8 }}>
        <div style={{ flex: "0 0 100px" }}><label>الدرجة</label><input type="number" min={0.5} step="0.5" value={marks} onChange={(e) => setMarks(e.target.value)} /></div>
        <button onClick={() => save()}>حفظ التعديل</button>
        {q.status === "pending_review" ? <button onClick={() => save({ status: "approved" })}>اعتماد</button> : <button className="ghost" onClick={() => save({ status: "pending_review" })}>إرجاع للمراجعة</button>}
        <button className="ghost" onClick={onDelete}>حذف</button>
      </div>
      <p className="err">{err}</p>
    </div>
  );
}
