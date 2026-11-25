"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { TYPE_LABELS } from "@/lib/qtypes";
import AssignBox, { type Stu, type Target } from "@/components/AssignBox";

type Ex = { id: number; title: string; kind: string; grade_level: string | null; status: string; total: number; pending: number };
type Cls = { id: number; name: string };

function keyText(q: any): string {
  const d = q.data || {};
  switch (q.qtype) {
    case "mcq": return (d.options || []).map((o: any) => ((d.correct || []).map(String).includes(String(o.id)) ? "✓ " : "") + o.text).join(" | ");
    case "tf": return d.correct ? "صح" : "خطأ";
    case "fill": return (d.blanks || []).map((b: string[]) => b.join(" / ")).join(" ، ");
    case "short": return (d.accepted || []).join(" / ") || "تصحيح يدوي";
    case "matching": return (d.pairs || []).map((p: any) => `${p.left} ← ${p.right}`).join(" | ");
    case "dragdrop": return (d.items || []).map((it: any) => `${it.text} ← ${(d.targets || [])[it.target]}`).join(" | ");
    case "ordering": return (d.items || []).join(" ← ");
    default: return "تصحيح يدوي";
  }
}

export default function ExamsPage() {
  const [list, setList] = useState<Ex[]>([]);
  const [classes, setClasses] = useState<Cls[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [students, setStudents] = useState<Stu[]>([]);
  const [tg, setTg] = useState<Target>({ classIds: [], studentIds: [] });
  const [msg, setMsg] = useState("");

  const load = () => api<Ex[]>("/api/exams").then(setList).catch((e) => setMsg(e.message));
  const loadDetail = (id: number) => api("/api/exams/" + id).then(setDetail).catch((e) => setMsg(e.message));
  useEffect(() => { load(); api<Cls[]>("/api/classes").then(setClasses).catch(() => {}); api<Stu[]>("/api/students").then(setStudents).catch(() => {}); }, []);

  function toggle(id: number) {
    if (open === id) { setOpen(null); setDetail(null); return; }
    setOpen(id); setDetail(null); setMsg(""); loadDetail(id);
  }
  async function act(id: number, body: object) {
    setMsg("");
    try { await api("/api/exams/" + id, "POST", body); await loadDetail(id); load(); }
    catch (x: any) { setMsg(x.message); }
  }
  async function del(id: number) {
    if (!confirm("حذف هذا الامتحان؟ تبقى أسئلته في البنك.")) return;
    try { await api("/api/exams/" + id, "DELETE"); setOpen(null); setDetail(null); load(); }
    catch (x: any) { setMsg(x.message); }
  }

  return (
    <div className="card">
      <h1>الامتحانات</h1>
      <p className="muted"><a className="btn" href="/exams/new" style={{ textDecoration: "none", display: "inline-grid", placeItems: "center" }}>+ امتحان جديد</a> <a className="btn ghost" href="/exams/from-bank" style={{ textDecoration: "none", display: "inline-grid", placeItems: "center", background: "var(--card)", color: "var(--teal)", border: "1.5px solid var(--line)", boxShadow: "none" }}>امتحان من البنك</a> اكتب امتحانك هنا مباشرة، أو استورده من <a href="/import">صفحة الاستيراد</a>، ثم اعتمد أسئلته وانشره وأسنده لصف.</p>
      <p className="err">{msg}</p>
      {!list.length && <p className="muted">لا توجد امتحانات بعد.</p>}
      {list.map((e) => (
        <div key={e.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
          <div className="row" style={{ alignItems: "center" }}>
            <div style={{ flex: "3 1 260px" }}><b>{e.title}</b>
              <div className="muted">{e.total} سؤال{e.grade_level ? ` — المرحلة ${e.grade_level}` : ""}</div></div>
            <div>{e.status === "published" ? <span className="ok">منشور</span> : <span className="muted">مسودة</span>}
              {e.pending > 0 && <div className="err">{e.pending} بانتظار الاعتماد</div>}</div>
            <button className="ghost" onClick={() => toggle(e.id)}>{open === e.id ? "إغلاق" : "فتح"}</button>
          </div>

          {open === e.id && detail && (
            <div style={{ marginTop: 10 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                {detail.questions.some((q: any) => q.status === "pending_review") &&
                  <button onClick={() => act(e.id, { action: "approve" })}>اعتماد كل الأسئلة</button>}
                {detail.exam.status === "published"
                  ? <button className="ghost" onClick={() => act(e.id, { action: "unpublish" })}>إلغاء النشر</button>
                  : <button onClick={() => act(e.id, { action: "publish" })}>نشر الامتحان</button>}
                <a className="btn ghost" style={{ textDecoration: "none", display: "inline-grid", placeItems: "center", background: "var(--card)", color: "var(--teal)", border: "1.5px solid var(--line)", boxShadow: "none" }} href={`/exams/${e.id}/results`}>النتائج</a>
                <a className="btn" style={{ textDecoration: "none", display: "inline-grid", placeItems: "center" }} href={`/exams/${e.id}/monitor`}>متابعة مباشرة</a>
                <button className="ghost" onClick={() => del(e.id)}>حذف</button>
              </div>

              <b>الإسناد (صف أو عدة صفوف أو طالب معين)</b>
              <div style={{ margin: "6px 0 10px" }}>
                <AssignBox classes={classes} students={students} value={tg} onChange={setTg} />
                <button style={{ marginTop: 8 }} disabled={!tg.classIds.length && !tg.studentIds.length}
                  onClick={async () => { await act(e.id, { action: "assign", class_ids: tg.classIds, student_ids: tg.studentIds }); setTg({ classIds: [], studentIds: [] }); }}>إسناد</button>
              </div>
              {detail.assignments.length === 0 && <p className="muted">لم يُسند لأي صف أو طالب بعد، فلن يظهر للطلاب.</p>}
              {detail.assignments.map((a: any) => (
                <span key={a.id} className="idcard" style={{ display: "inline-block", margin: "0 0 6px 6px", padding: "4px 10px" }}>
                  {a.name} <button className="ghost" style={{ minHeight: 28, padding: "0 8px" }} onClick={() => act(e.id, { action: "unassign", assignment_id: a.id })}>×</button>
                </span>
              ))}

              <div className="tbl" style={{ marginTop: 10 }}><table>
                <thead><tr><th>#</th><th>السؤال</th><th>النوع</th><th>الإجابة</th><th>الدرجة</th><th>الحالة</th></tr></thead>
                <tbody>{detail.questions.map((q: any, i: number) => (
                  <tr key={q.id}><td>{i + 1}</td><td>{q.prompt}</td><td>{TYPE_LABELS[q.qtype] || q.qtype}</td>
                    <td className="muted">{keyText(q)}</td><td>{q.marks}</td>
                    <td>{q.status === "approved" ? <span className="ok">معتمد</span> : <span className="err">بانتظار الاعتماد</span>}</td></tr>
                ))}</tbody>
              </table></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
