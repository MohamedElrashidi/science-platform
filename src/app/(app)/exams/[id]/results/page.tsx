"use client";
import { Fragment, use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Empty, ExamBars } from "@/components/Charts";

const STATUS: Record<string, string> = { in_progress: "جارٍ", submitted: "بانتظار التصحيح", graded: "مصحَّح" };

export default function Results({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<any>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [det, setDet] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const load = () => api("/api/exams/" + id + "/results").then(setD).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, [id]);

  async function view(aid: number) {
    if (open === aid) { setOpen(null); return; }
    setOpen(aid); setDet(null); setMsg("");
    try { setDet(await api("/api/attempts/" + aid)); } catch (x: any) { setMsg(x.message); }
  }
  async function grade(aid: number, qid: number, marks: string, feedback: string) {
    setMsg("");
    try { await api("/api/attempts/" + aid, "PATCH", { question_id: qid, marks: Number(marks), feedback }); setDet(await api("/api/attempts/" + aid)); load(); }
    catch (x: any) { setMsg(x.message); }
  }
  function csv() {
    const rows = [["الطالب", "الصف", "المحاولة", "الدرجة", "من", "النسبة", "الحالة"],
      ...d.attempts.filter((a: any) => a.status !== "in_progress").map((a: any) => [a.student, a.class, a.attempt_no, a.score ?? "", a.total ?? "", a.percent ?? "", STATUS[a.status]])];
    const t = rows.map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + t], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `نتائج-${d.exam.title}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  if (!d) return <div className="card"><p className="err">{msg}</p>{!msg && <div className="skeleton" style={{ height: 120 }} />}</div>;
  const done = d.attempts.filter((a: any) => a.status !== "in_progress");
  const graded = done.filter((a: any) => a.status === "graded");
  const avg = graded.length ? Math.round(graded.reduce((s: number, a: any) => s + Number(a.percent), 0) / graded.length) : null;
  const hardest = [...d.questions].filter((q: any) => q.rate !== null).sort((a: any, b: any) => a.rate - b.rate).slice(0, 6);

  return (
    <>
      <div className="card">
        <div className="sec"><h1 style={{ margin: 0 }}>نتائج: {d.exam.title}</h1><Link href="/exams">رجوع للامتحانات</Link></div>
        <div className="stats" style={{ marginTop: 14 }}>
          <div className="stat"><div className="v">{done.length}</div><div className="l">تسليمات</div></div>
          <div className="stat" style={{ ["--tint" as any]: "#E8E8FA" }}><div className="v">{avg === null ? "—" : `${avg}%`}</div><div className="l">متوسط الدرجات</div></div>
          <div className="stat" style={{ ["--tint" as any]: "#FCEBD0" }}><div className="v">{done.filter((a: any) => a.status === "submitted").length}</div><div className="l">بانتظار التصحيح</div></div>
        </div>
        <p className="err">{msg}</p>
      </div>

      <div className="panels" style={{ marginTop: 16 }}>
        <div className="card"><div className="sec"><h2>أصعب الأسئلة</h2><span className="badge">نسبة الإجابة الصحيحة</span></div>
          {hardest.length ? <ExamBars data={hardest.map((q: any) => ({ title: `${q.no}. ${q.prompt}`.slice(0, 60), avg: q.rate, n: q.n }))} /> : <Empty text="تظهر بعد أول تسليم." />}</div>
        <div className="card"><div className="sec"><h2>التسليمات</h2>{done.length > 0 && <button className="ghost" onClick={csv}>تصدير Excel (CSV)</button>}</div>
          {!d.attempts.length ? <Empty text="لا توجد تسليمات بعد." /> : (
            <div className="tbl"><table><thead><tr><th>الطالب</th><th>الصف</th><th>الدرجة</th><th>الحالة</th><th></th></tr></thead>
              <tbody>{d.attempts.map((a: any) => (<Fragment key={a.id}>
                <tr><td>{a.student}{a.attempt_no > 1 ? ` (م${a.attempt_no})` : ""}</td><td>{a.class}</td>
                  <td>{a.status === "in_progress" ? "—" : `${Math.round(Number(a.percent))}%`}</td>
                  <td><span className={"badge " + (a.status === "graded" ? "g" : a.status === "submitted" ? "a" : "")}>{STATUS[a.status]}</span></td>
                  <td>{a.status !== "in_progress" && <button className="ghost sm" onClick={() => view(a.id)}>{open === a.id ? "إخفاء" : "عرض / تصحيح"}</button>}</td></tr>
                {open === a.id && <tr><td colSpan={5}>{!det ? "…" : det.answers.map((r: any, k: number) => <Row key={r.question_id} k={k} r={r} onSave={(m, f) => grade(a.id, r.question_id, m, f)} />)}</td></tr>}
              </Fragment>))}</tbody></table></div>)}
        </div>
      </div>
    </>
  );
}

function Row({ k, r, onSave }: { k: number; r: any; onSave: (m: string, f: string) => void }) {
  const [m, setM] = useState(r.marks ?? ""), [f, setF] = useState(r.feedback ?? "");
  const manual = r.needs_manual;
  return (
    <div className={"rv " + (manual && r.marks === null ? "" : r.is_correct ? "right" : "wrong")} style={{ marginTop: 8 }}>
      <b>{k + 1}. {r.prompt}</b>
      <p className="muted" style={{ margin: "6px 0 0" }}>إجابة الطالب:</p><pre>{r.mine}</pre>
      {r.key && <><p className="muted" style={{ margin: 0 }}>الصحيح:</p><pre>{r.key}</pre></>}
      {manual ? (
        <div className="row" style={{ marginTop: 8 }}>
          <div style={{ flex: "0 0 110px" }}><label>الدرجة (من {r.max})</label><input type="number" min={0} max={r.max} step="0.5" value={m} onChange={(e) => setM(e.target.value)} /></div>
          <div><label>ملاحظة</label><input value={f} onChange={(e) => setF(e.target.value)} /></div>
          <button disabled={m === ""} onClick={() => onSave(String(m), f)}>حفظ</button>
        </div>
      ) : <span className="badge">{r.marks} / {r.max}</span>}
    </div>
  );
}
