"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/client";

type Row = { student_id: string; name: string; class: string; state: "none" | "running" | "done"; attempt_id: number | null; attempt_no: number; status: string | null;
  answered: number | null; current: number | null; percent: number | null; released: boolean; leaves: number; lock: "none" | "temp" | "final"; extra: number; attempts_used: number };
type Data = { exam: { id: number; title: string; max_attempts: number; release_mode: string; status: string }; total_questions: number; rows: Row[] };
type Live = { status: string; current: number | null; questions: { no: number; prompt: string; state: "correct" | "wrong" | "manual" | "none"; mine: string; key: string }[] };

const COL = { correct: "#1E8E5A", wrong: "#C23B3B", manual: "#B7791F", none: "#8A97A6" } as const;
const BG = { correct: "#E6F6EE", wrong: "#FBEAEA", manual: "#FDF3DC", none: "transparent" } as const;
const LBL = { correct: "صحيح", wrong: "خطأ", manual: "بانتظار تصحيحك", none: "لم يُجب" } as const;

export default function Monitor() {
  const id = Number(useParams<{ id: string }>().id);
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState("");
  const [sel, setSel] = useState<Row | null>(null);
  const [live, setLive] = useState<Live | null>(null);

  const load = useCallback(() => api<Data>(`/api/exams/${id}/monitor`).then(setD).catch((e) => setMsg(e.message)), [id]);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    if (!sel?.attempt_id) { setLive(null); return; }
    const go = () => api<Live>(`/api/attempts/${sel.attempt_id}/live`).then(setLive).catch(() => {});
    go(); const t = setInterval(go, 4000); return () => clearInterval(t);
  }, [sel?.attempt_id]);

  async function ctl(body: object, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setMsg("");
    try { await api(`/api/exams/${id}/control`, "POST", body); load(); } catch (x: any) { setMsg(x.message); }
  }
  async function exam(body: object) { setMsg(""); try { await api(`/api/exams/${id}`, "POST", body); load(); } catch (x: any) { setMsg(x.message); } }

  if (!d) return <div className="card">{msg ? <p className="err">{msg}</p> : <div className="skeleton" style={{ height: 120 }} />}</div>;
  const n = d.rows.length, running = d.rows.filter((r) => r.state === "running").length, done = d.rows.filter((r) => r.state === "done").length;
  const none = n - running - done;
  const stBadge = (r: Row) => r.lock === "final" ? <span className="badge a">أُنهي نهائيًا</span> : r.lock === "temp" ? <span className="badge a">مقفل مؤقتًا</span>
    : r.state === "running" ? <span className="badge g">يختبر الآن</span> : r.state === "done" ? <span className="badge">سلّم</span> : <span className="badge a">لم يبدأ</span>;

  return (
    <>
      <div className="card">
        <div className="sec"><h1 style={{ margin: 0 }}>متابعة: {d.exam.title}</h1><a href="/exams">رجوع</a></div>
        <div className="stats" style={{ marginTop: 10 }}>
          <div className="stat"><div className="v">{running}</div><div className="l">يختبرون الآن</div></div>
          <div className="stat" style={{ ["--tint" as any]: "#E8E8FA" }}><div className="v">{done}</div><div className="l">سلّموا</div></div>
          <div className="stat" style={{ ["--tint" as any]: "#FCEBD0" }}><div className="v">{none}</div><div className="l">لم يبدؤوا</div></div>
        </div>
        <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
          <div><label>نشر الدرجات</label>
            <select value={d.exam.release_mode} onChange={(e) => exam({ action: "set_release", mode: e.target.value })}>
              <option value="auto">تلقائي: تظهر للطالب فور التسليم</option>
              <option value="manual">يدوي: لا يرى شيئًا حتى تعتمد</option></select></div>
          <button onClick={() => exam({ action: "release" })}>اعتماد الدرجات ونشرها للجميع</button>
          <button className="ghost" onClick={() => exam({ action: "hide" })}>سحب الدرجات</button>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="ghost" onClick={() => ctl({ action: "lock_temp", all: true }, "قفل الاختبار مؤقتًا على كل الطلاب؟")}>قفل الكل مؤقتًا</button>
          <button className="ghost" onClick={() => ctl({ action: "unlock", all: true })}>فتح الكل</button>
          <button className="ghost" onClick={() => ctl({ action: "retake", all: true }, "منح كل الطلاب محاولة إضافية؟")}>إعادة للصف (محاولة إضافية)</button>
        </div>
        <p className="err">{msg}</p>
        <p className="muted">تتحدث الصفحة تلقائيًا كل 5 ثوانٍ. اضغط اسم طالب لترى أسئلته: الأخضر صحيح والأحمر خطأ.</p>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="tbl"><table>
          <thead><tr><th>الطالب</th><th>الصف</th><th>الحالة</th><th>التقدم</th><th>الدرجة</th><th>تحكم</th></tr></thead>
          <tbody>{d.rows.map((r) => (
            <tr key={r.student_id}>
              <td><a href="#" onClick={(e) => { e.preventDefault(); setSel(r); }}>{r.name}</a></td>
              <td>{r.class}</td><td>{stBadge(r)}{r.leaves > 0 && <span className="badge a" title="عدد مرات مغادرة صفحة الاختبار"> ⚠️ خرج {r.leaves}</span>}</td>
              <td>{r.state === "running" ? `${r.answered}/${d.total_questions} — عند السؤال ${(r.current ?? 0) + 1}` : r.state === "done" ? `${d.total_questions}/${d.total_questions}` : "—"}
                {r.attempts_used ? <span className="muted"> · محاولة {r.attempt_no}</span> : null}</td>
              <td>{r.percent !== null ? Math.round(Number(r.percent)) + "%" : "—"}{r.state === "done" && d.exam.release_mode === "manual" ? (r.released ? " ✓منشورة" : " (غير منشورة)") : ""}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                {r.lock === "temp" ? <button className="ghost" onClick={() => ctl({ action: "unlock", student_ids: [r.student_id] })}>فتح</button>
                  : <button className="ghost" onClick={() => ctl({ action: "lock_temp", student_ids: [r.student_id] })}>قفل مؤقت</button>}{" "}
                <button className="ghost" onClick={() => ctl({ action: "lock_final", student_ids: [r.student_id] }, `إنهاء اختبار ${r.name} نهائيًا؟`)}>إنهاء قهري</button>{" "}
                {r.state === "done" && <button className="ghost" onClick={() => ctl({ action: "reopen", student_ids: [r.student_id] }, "إعادة فتح المحاولة ليكملها الطالب؟")}>استكمال</button>}{" "}
                {r.state !== "running" && <button className="ghost" onClick={() => ctl({ action: "retake", student_ids: [r.student_id] })}>إعادة{r.extra ? ` (+${r.extra})` : ""}</button>}
              </td>
            </tr>))}
            {!d.rows.length && <tr><td colSpan={6} className="muted">لم يُسند الامتحان لأي صف أو طالب بعد.</td></tr>}</tbody>
        </table></div>
      </div>

      {sel && (
        <div className="modal-bg" onClick={() => setSel(null)}>
          <div className="modal" style={{ maxWidth: 680, maxHeight: "85vh", overflow: "auto" }} role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sec"><h2>{sel.name}</h2><button className="ghost" onClick={() => setSel(null)}>إغلاق</button></div>
            {!sel.attempt_id ? <p className="muted">لم يبدأ هذا الطالب الاختبار بعد.</p> : !live ? <div className="skeleton" style={{ height: 80 }} /> : (
              <>
                <p className="muted">{live.status === "in_progress" ? `يختبر الآن — عند السؤال ${(live.current ?? 0) + 1}` : "أنهى الاختبار"} · <span style={{ color: COL.correct }}>● صحيح</span> <span style={{ color: COL.wrong }}>● خطأ</span> <span style={{ color: COL.none }}>● لم يُجب</span></p>
                {live.questions.map((q) => (
                  <div key={q.no} style={{ borderInlineStart: `5px solid ${COL[q.state]}`, background: BG[q.state], borderRadius: 8, padding: "8px 12px", margin: "6px 0" }}>
                    <b>{q.no}. {q.prompt}</b>
                    <div style={{ color: COL[q.state], fontWeight: 700 }}>{LBL[q.state]}</div>
                    {q.mine && <div className="muted">إجابته: {q.mine}</div>}
                    {q.state === "wrong" && <div className="muted">الصحيح: {q.key}</div>}
                  </div>))}
              </>)}
          </div>
        </div>)}
    </>
  );
}
