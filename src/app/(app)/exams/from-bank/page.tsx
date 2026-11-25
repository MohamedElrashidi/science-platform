"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { TYPE_LABELS } from "@/lib/qtypes";
import AssignBox, { type Cls, type Stu, type Target } from "@/components/AssignBox";

export default function FromBank() {
  const [rows, setRows] = useState<any[]>([]);
  const [classes, setClasses] = useState<Cls[]>([]);
  const [students, setStudents] = useState<Stu[]>([]);
  const [sel, setSel] = useState<number[]>([]);
  const [q, setQ] = useState(""), [scope, setScope] = useState(""), [qt, setQt] = useState("");
  const [f, setF] = useState({ title: "", grade: "", duration: "", attempts: "1", show_answers: true, show_score: true, shuffle_questions: false, shuffle_options: true, single: false, release: "auto" });
  const [tg, setTg] = useState<Target>({ classIds: [], studentIds: [] });
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);

  useEffect(() => {
    api<any[]>("/api/questions?status=approved").then(setRows).catch((e) => setMsg(e.message));
    api<Cls[]>("/api/classes").then(setClasses).catch(() => {});
    api<Stu[]>("/api/students").then(setStudents).catch(() => {});
  }, []);

  const shown = useMemo(() => rows.filter((r) =>
    (!q || r.prompt.includes(q)) && (!qt || r.qtype === qt) &&
    (!scope || (scope === "general" ? !r.data?.scope_class : String(r.data?.scope_class) === scope))), [rows, q, qt, scope]);
  const total = sel.reduce((s, id) => s + (Number(rows.find((r) => r.id === id)?.marks) || 0), 0);
  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function save(publish: boolean) {
    setMsg(""); setBusy(true);
    try {
      await api("/api/exams/from-bank", "POST", {
        title: f.title, grade_level: f.grade, duration_minutes: f.duration ? Number(f.duration) : null, max_attempts: f.single ? 1 : Number(f.attempts) || 1, release_mode: f.release,
        show_answers: f.show_answers, show_score: f.show_score, shuffle_questions: f.shuffle_questions, shuffle_options: f.shuffle_options,
        question_ids: sel, class_ids: tg.classIds, student_ids: tg.studentIds, publish,
      });
      window.location.assign("/exams");
    } catch (x: any) { setMsg(x.message); setBusy(false); }
  }

  return (
    <>
      <div className="card">
        <h1>امتحان من بنك الأسئلة</h1>
        <p className="muted">اختر أسئلة معتمدة من البنك، ثم حدّد لمن يُسند الامتحان: صف أو عدة صفوف أو طالب معين.</p>
        <div className="row">
          <div style={{ flex: "3 1 260px" }}><label>عنوان الامتحان</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><label>المرحلة</label><input value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} style={{ width: 80 }} /></div>
          <div><label>مدة الامتحان كاملًا (دقائق)</label><input type="number" min={1} value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} style={{ width: 120 }} placeholder="بلا حد" /></div>
          <div><label>المحاولات</label><input type="number" min={1} disabled={f.single} value={f.single ? "1" : f.attempts} onChange={(e) => setF({ ...f, attempts: e.target.value })} style={{ width: 80 }} /></div>
          <label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}><input type="checkbox" style={{ width: "auto" }} checked={f.single} onChange={(e) => setF({ ...f, single: e.target.checked })} />محاولة واحدة فقط</label>
          <div><label>نشر الدرجات</label><select value={f.release} onChange={(e) => setF({ ...f, release: e.target.value })}><option value="auto">تلقائي: تظهر فور التسليم</option><option value="manual">يدوي: بعد اعتمادك</option></select></div>
        </div>
        <p className="muted" style={{ margin: "6px 0" }}>مؤقت كل سؤال يُحدَّد عند كتابة السؤال في «إنشاء أسئلة»، ويمكن الجمع بينه وبين مدة الامتحان.</p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {([["show_score", "يرى الطالب درجته"], ["show_answers", "يراجع الإجابات"], ["shuffle_questions", "خلط الأسئلة"], ["shuffle_options", "خلط الخيارات"]] as const).map(([k, l]) => (
            <label key={k} style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />{l}</label>))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="sec"><h2>الأسئلة</h2><span className="badge g">{sel.length} محدد — {total} درجة</span></div>
        <div className="row">
          <div><label>بحث</label><input value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div><label>النوع</label><select value={qt} onChange={(e) => setQt(e.target.value)}><option value="">الكل</option>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label>النطاق</label><select value={scope} onChange={(e) => setScope(e.target.value)}><option value="">الكل</option><option value="general">عام</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        </div>
        <div style={{ margin: "8px 0" }}>
          <button className="ghost" onClick={() => setSel(Array.from(new Set([...sel, ...shown.map((r) => r.id)])))}>تحديد المعروض</button>{" "}
          <button className="ghost" onClick={() => setSel([])}>إلغاء التحديد</button>
        </div>
        {!shown.length && <p className="muted">لا توجد أسئلة معتمدة مطابقة.</p>}
        {shown.map((r) => (
          <label key={r.id} className="rv" style={{ padding: 10, display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" style={{ width: 22, minHeight: 22, flex: "0 0 22px" }} checked={sel.includes(r.id)} onChange={() => toggle(r.id)} />
            <span style={{ flex: 1 }}>
              <b style={{ whiteSpace: "pre-line" }}>{r.prompt.slice(0, 140)}{r.prompt.length > 140 ? "…" : ""}</b>
              <span className="muted" style={{ display: "block", fontSize: ".85rem" }}>{TYPE_LABELS[r.qtype]} · {r.lessons?.title ?? "—"} · {r.marks} درجة{r.data?.time_limit ? ` · ⏱ ${r.data.time_limit}ث` : ""}</span>
            </span>
          </label>))}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2>لمن يُسند؟</h2>
        <AssignBox classes={classes} students={students} value={tg} onChange={setTg} />
        <div style={{ marginTop: 12 }}>
          <button disabled={busy} className="ghost" onClick={() => save(false)}>حفظ كمسودة</button>{" "}
          <button disabled={busy || (!tg.classIds.length && !tg.studentIds.length)} onClick={() => save(true)}>حفظ ونشر الآن</button>
        </div>
        <p className="err">{msg}</p>
        <p className="muted">«حفظ ونشر» يتطلب اختيار صف أو طالب. المسودة لا يراها الطلاب حتى تنشرها من صفحة الامتحانات.</p>
      </div>
    </>
  );
}
