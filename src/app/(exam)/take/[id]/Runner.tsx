"use client";
import { styleCss } from "@/lib/qtypes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import Icon from "@/components/Icon";

type Q = any;
type Payload = { attempt: { id: number; status: string; remaining_seconds: number | null }; exam: any; answers: Record<string, any>; questions?: Q[] };
const isEmpty = (a: any) => a === undefined || a === null || a === "" || (Array.isArray(a) && !a.length) ||
  (typeof a === "object" && !Array.isArray(a) && !Object.keys(a).length) ||
  (Array.isArray(a) && a.every((x) => x === "" || x === null || x === undefined));
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function Runner({ examId }: { examId: number }) {
  const [p, setP] = useState<Payload | null>(null);
  const [err, setErr] = useState("");
  const [ans, setAns] = useState<Record<string, any>>({});
  const [i, setI] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<"" | "saving" | "saved" | "fail">("");
  const [fb, setFb] = useState<Record<string, any>>({});
  const endAt = useRef<number | null>(null), dirty = useRef(false), aid = useRef(0), sending = useRef(false), done = useRef(false);
  const ansRef = useRef(ans); ansRef.current = ans;

  useEffect(() => {
    api<Payload>(`/api/student/exams/${examId}/start`, "POST").then((d) => {
      if (d.attempt.status !== "in_progress") { window.location.replace(`/result/${d.attempt.id}`); return; }
      aid.current = d.attempt.id; setP(d); setAns(d.answers || {});
      if (d.attempt.remaining_seconds !== null) { endAt.current = Date.now() + d.attempt.remaining_seconds * 1000; setLeft(d.attempt.remaining_seconds); }
    }).catch((x) => setErr(x.message));
  }, [examId]);

  const flush = useCallback(async () => {
    if (sending.current || !dirty.current || done.current) return;
    sending.current = true; dirty.current = false; setSaved("saving");
    try { await api(`/api/student/attempts/${aid.current}/answers`, "PUT", { answers: ansRef.current }); setSaved("saved"); }
    catch (x: any) { dirty.current = true; setSaved("fail"); if (/انتهى/.test(x.message)) window.location.replace(`/result/${aid.current}`); }
    sending.current = false;
  }, []);
  useEffect(() => { const t = setInterval(flush, 2500); return () => clearInterval(t); }, [flush]);

  const submit = useCallback(async () => {
    if (done.current) return; done.current = true; setBusy(true);
    try { await api(`/api/student/attempts/${aid.current}/submit`, "POST", { answers: ansRef.current }); window.location.replace(`/result/${aid.current}`); }
    catch (x: any) { done.current = false; setBusy(false); setErr(x.message); }
  }, []);

  useEffect(() => {
    if (endAt.current === null) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current! - Date.now()) / 1000)); setLeft(s);
      if (s <= 0) submit();
    }, 1000);
    return () => clearInterval(t);
  }, [p, submit]);

  const set = (qid: number, v: any) => { setAns((o) => ({ ...o, [qid]: v })); dirty.current = true; setSaved(""); };
  const qs = p?.questions || [];
  const q = qs[i];
  const answered = useMemo(() => qs.filter((x) => !isEmpty(ans[x.id])).length, [qs, ans]);

  async function check(q: Q) {
    try { const r = await api(`/api/student/attempts/${aid.current}/check`, "POST", { question_id: q.id, answer: ans[q.id] }); setFb((o) => ({ ...o, [q.id]: r })); }
    catch (x: any) { setFb((o) => ({ ...o, [q.id]: { error: x.message } })); }
  }

  if (err && !p) return <div className="center"><div className="card" style={{ maxWidth: 460, textAlign: "center" }}><h2>تعذّر فتح الاختبار</h2><p className="err">{err}</p><Link href="/dashboard">العودة للرئيسية</Link></div></div>;
  if (!p || !q) return <div className="center"><div className="muted">جارٍ تحميل الاختبار…</div></div>;
  const pct = Math.round(((i + 1) / qs.length) * 100);
  const low = left !== null && left <= 60;

  return (
    <div className="ex">
      <header className="ex-top">
        <div className="ex-title"><span className="badge g">{p.exam.kind === "exam" ? "امتحان" : "اختبار"}</span><strong>{p.exam.title}</strong></div>
        <div className="ex-meta">
          <span className={"ex-save " + saved}>{saved === "saving" ? "جارٍ الحفظ…" : saved === "saved" ? "تم الحفظ" : saved === "fail" ? "تعذّر الحفظ" : ""}</span>
          {left !== null && <span className={"ex-timer" + (low ? " low" : "")} aria-label="الوقت المتبقي">{clock(left)}</span>}
        </div>
      </header>
      <div className="ex-bar" role="progressbar" aria-valuenow={pct}><i style={{ width: `${pct}%` }} /></div>

      <main className="ex-main">
        <section className="qcard" key={q.id}>
          <div className="q-head"><span className="q-no">السؤال {i + 1} من {qs.length}</span><span className="badge">{q.marks} {q.marks === 1 ? "درجة" : "درجات"}</span></div>
          {q.section && <h2 className="q-section">{q.section}</h2>}
          {q.passage && <div className="passage">{q.passage}</div>}
          {q.media_url && <img className="q-img" src={q.media_url} alt={q.media_alt || "صورة السؤال"} />}
          <p className="q-text" style={styleCss(q.style)}>{q.prompt}</p>
          {q.instructions && <p className="muted">{q.instructions}</p>}
          <Answer q={q} v={ans[q.id]} set={(v) => set(q.id, v)} />
          {p.exam.practice_mode && (
            <div style={{ marginTop: 14 }}>
              <button type="button" className="ghost" onClick={() => check(q)}>تحقق من إجابتي</button>
              {fb[q.id] && <div className={"fb " + (fb[q.id].correct ? "ok" : fb[q.id].error || fb[q.id].manual ? "" : "bad")}>
                {fb[q.id].error ? fb[q.id].error : fb[q.id].empty ? "اختر إجابة أولًا" : fb[q.id].manual ? "هذا السؤال يصححه المعلم"
                  : <>{fb[q.id].correct ? "إجابة صحيحة" : <>إجابة غير صحيحة. الصحيح: <b>{fb[q.id].correct_text}</b></>}{fb[q.id].explanation && <div className="muted">{fb[q.id].explanation}</div>}</>}
              </div>}
            </div>
          )}
        </section>

        <nav className="qnav" aria-label="التنقل بين الأسئلة">
          {qs.map((x, k) => <button key={x.id} type="button" className={"qdot" + (k === i ? " cur" : "") + (!isEmpty(ans[x.id]) ? " done" : "")} onClick={() => setI(k)} aria-label={`السؤال ${k + 1}`}>{k + 1}</button>)}
        </nav>
      </main>

      <footer className="ex-foot">
        <button type="button" className="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>السابق</button>
        <span className="muted ex-count">{answered} / {qs.length} مجاب</span>
        {i < qs.length - 1
          ? <button type="button" onClick={() => setI(i + 1)}>التالي</button>
          : <button type="button" className="amber" onClick={() => { flush(); setConfirm(true); }}>إنهاء وتسليم</button>}
      </footer>
      {i < qs.length - 1 && <div className="ex-submit"><button type="button" className="ghost" onClick={() => { flush(); setConfirm(true); }}>إنهاء وتسليم الاختبار</button></div>}

      {confirm && (
        <div className="modal-bg" onClick={() => !busy && setConfirm(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>تسليم الاختبار؟</h2>
            <p>أجبت عن <b>{answered}</b> من <b>{qs.length}</b> سؤال.{answered < qs.length && <span className="err" style={{ display: "block" }}>تبقّى {qs.length - answered} سؤال بلا إجابة.</span>}</p>
            <p className="muted">لا يمكن تعديل الإجابات بعد التسليم.</p>
            <p className="err">{err}</p>
            <div className="row" style={{ marginTop: 8 }}>
              <button type="button" className="ghost" disabled={busy} onClick={() => setConfirm(false)}>العودة للأسئلة</button>
              <button type="button" disabled={busy} onClick={submit}>{busy ? "جارٍ التسليم…" : "نعم، سلّم"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Answer({ q, v, set }: { q: Q; v: any; set: (v: any) => void }) {
  const t = q.qtype;
  if (t === "mcq") {
    const sel: string[] = Array.isArray(v) ? v : v ? [v] : [];
    return <div className="opts">{q.options.map((o: any) => {
      const on = sel.includes(o.id);
      return <button type="button" key={o.id} className={"opt" + (on ? " sel" : "")} aria-pressed={on}
        onClick={() => set(q.multiple ? (on ? sel.filter((x) => x !== o.id) : [...sel, o.id]) : [o.id])}>
        <span className={"mark" + (q.multiple ? " sq" : "")}>{on && <Icon name="check" size={14} />}</span><span>{o.text}</span></button>;
    })}{q.multiple && <p className="muted">يمكنك اختيار أكثر من إجابة.</p>}</div>;
  }
  if (t === "tf") return <div className="opts">{[[true, "صح"], [false, "خطأ"]].map(([val, label]) =>
    <button type="button" key={String(val)} className={"opt" + (v === val ? " sel" : "")} aria-pressed={v === val} onClick={() => set(val)}>
      <span className="mark">{v === val && <Icon name="check" size={14} />}</span><span>{label as string}</span></button>)}</div>;
  if (t === "fill") {
    const arr: string[] = Array.isArray(v) ? v : [];
    return <div className="opts">{Array.from({ length: q.blank_count }).map((_, k) =>
      <input key={k} placeholder={`الفراغ ${k + 1}`} value={arr[k] || ""} onChange={(e) => { const n = Array.from({ length: q.blank_count }, (_, j) => arr[j] || ""); n[k] = e.target.value; set(n); }} />)}</div>;
  }
  if (t === "short") return <input placeholder="اكتب إجابتك" value={v || ""} onChange={(e) => set(e.target.value)} />;
  if (t === "essay") return <textarea rows={8} placeholder="اكتب إجابتك هنا" value={v || ""} onChange={(e) => set(e.target.value)} />;
  if (t === "matching") {
    const m = v && typeof v === "object" ? v : {};
    return <div className="opts">{q.lefts.map((l: string, k: number) => <label key={k} className="pair"><span>{l}</span>
      <select value={m[String(k)] || ""} onChange={(e) => set({ ...m, [String(k)]: e.target.value })}>
        <option value="">اختر…</option>{q.rights.map((r: string, j: number) => <option key={j} value={r}>{r}</option>)}</select></label>)}</div>;
  }
  if (t === "dragdrop") {
    const m = v && typeof v === "object" ? v : {};
    return <div className="opts"><p className="muted">حدّد المجموعة المناسبة لكل عنصر.</p>{q.items.map((it: any) => <label key={it.id} className="pair"><span>{it.text}</span>
      <select value={m[String(it.id)] ?? ""} onChange={(e) => set({ ...m, [String(it.id)]: e.target.value })}>
        <option value="">اختر…</option>{q.targets.map((tg: string, j: number) => <option key={j} value={j}>{tg}</option>)}</select></label>)}</div>;
  }
  if (t === "ordering") {
    const order: number[] = Array.isArray(v) && v.length === q.items.length ? v.map(Number) : q.items.map((x: any) => x.id);
    const text = (id: number) => q.items.find((x: any) => x.id === id)?.text;
    const mv = (k: number, d: number) => { const n = order.slice(); const j = k + d; if (j < 0 || j >= n.length) return; [n[k], n[j]] = [n[j], n[k]]; set(n); };
    return <div className="opts"><p className="muted">رتّب العناصر بالأسهم.</p>{order.map((id, k) => <div key={id} className="ord"><span className="q-no">{k + 1}</span><span style={{ flex: 1 }}>{text(id)}</span>
      <button type="button" className="ghost sm" onClick={() => mv(k, -1)} disabled={k === 0} aria-label="أعلى">▲</button>
      <button type="button" className="ghost sm" onClick={() => mv(k, 1)} disabled={k === order.length - 1} aria-label="أسفل">▼</button></div>)}</div>;
  }
  return null;
}
