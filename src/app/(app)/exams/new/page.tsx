"use client";
import { useState } from "react";
import { api } from "@/lib/client";

type Q = {
  type: "mcq" | "tf" | "fill" | "short" | "essay"; prompt: string; marks: string; lesson: string; explanation: string;
  options: string[]; correct: number; tf: boolean; blanks: string; accepted: string; model: string;
};
const blank = (): Q => ({ type: "mcq", prompt: "", marks: "1", lesson: "", explanation: "", options: ["", "", "", ""], correct: 0, tf: true, blanks: "", accepted: "", model: "" });
const LABEL = { mcq: "اختيار من متعدد", tf: "صح وخطأ", fill: "إكمال الفراغ", short: "إجابة قصيرة", essay: "مقالي (تصحيح يدوي)" };

export default function NewExam() {
  const [f, setF] = useState({ title: "", subject: "العلوم", lesson: "", grade: "", duration: "", attempts: "1", show_answers: true, show_score: true, shuffle_questions: false, shuffle_options: true });
  const [qs, setQs] = useState<Q[]>([blank()]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const up = (i: number, p: Partial<Q>) => setQs(qs.map((q, k) => (k === i ? { ...q, ...p } : q)));

  function toJson() {
    return {
      title: f.title.trim(), subject: f.subject.trim() || null, lesson: f.lesson.trim() || null, grade_level: f.grade.trim() || null,
      duration_minutes: f.duration ? Number(f.duration) : null, max_attempts: Number(f.attempts) || 1,
      show_answers: f.show_answers, show_score: f.show_score, shuffle_questions: f.shuffle_questions, shuffle_options: f.shuffle_options,
      questions: qs.map((q) => {
        const base: any = { type: q.type, prompt: q.prompt, marks: Number(q.marks) || 1, lesson: q.lesson.trim() || undefined, explanation: q.explanation.trim() || undefined };
        if (q.type === "mcq") { const opts = q.options.map((o) => o.trim()); return { ...base, options: opts.filter(Boolean), correct: opts.filter(Boolean).indexOf(opts[q.correct]) }; }
        if (q.type === "tf") return { ...base, correct: q.tf };
        if (q.type === "fill") return { ...base, blanks: q.blanks.split(/\n/).map((l) => l.split(/[|،;]/).map((x) => x.trim()).filter(Boolean)).filter((b) => b.length) };
        if (q.type === "short") return { ...base, accepted: q.accepted.split(/[|،;\n]/).map((x) => x.trim()).filter(Boolean) };
        return { ...base, model_answer: q.model.trim() || undefined };
      }),
    };
  }

  async function save() {
    setMsg(""); setBusy(true);
    try {
      const r = await api<{ results: { ok: boolean; errors?: string[] }[] }>("/api/import", "POST", { ...toJson(), auto_approve: true });
      const x = r.results[0];
      if (!x.ok) { setMsg((x.errors || ["تعذر الحفظ"]).join(" | ")); setBusy(false); return; }
      window.location.assign("/exams");
    } catch (e: any) { setMsg(e.message); setBusy(false); }
  }

  return (
    <>
      <div className="card">
        <h1>امتحان جديد</h1>
        <p className="muted">اكتب الامتحان هنا. الأسئلة تُعتمد تلقائيًا لأنك كتبتها بنفسك، ويُحفظ الامتحان مسودة ثم تنشره وتسنده لصف من صفحة الامتحانات.</p>
        <div className="row">
          <div style={{ flex: "3 1 260px" }}><label>عنوان الامتحان</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><label>المادة</label><input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
          <div><label>الدرس (اختياري)</label><input value={f.lesson} onChange={(e) => setF({ ...f, lesson: e.target.value })} /></div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <div><label>المرحلة / الصف</label><input value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} placeholder="5" style={{ width: 90 }} /></div>
          <div><label>المدة بالدقائق (فارغ = بلا حد)</label><input type="number" min={1} value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} style={{ width: 110 }} /></div>
          <div><label>عدد المحاولات</label><input type="number" min={1} value={f.attempts} onChange={(e) => setF({ ...f, attempts: e.target.value })} style={{ width: 90 }} /></div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
          {([["show_score", "يرى الطالب درجته"], ["show_answers", "يراجع الإجابات بعد التسليم"], ["shuffle_questions", "خلط ترتيب الأسئلة"], ["shuffle_options", "خلط الخيارات"]] as const).map(([k, l]) => (
            <label key={k} style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />{l}</label>))}
        </div>
      </div>

      {qs.map((q, i) => (
        <div className="card" key={i} style={{ marginTop: 14 }}>
          <div className="sec"><h2>السؤال {i + 1}</h2>
            {qs.length > 1 && <button className="ghost" onClick={() => setQs(qs.filter((_, k) => k !== i))}>حذف</button>}</div>
          <div className="row">
            <div><label>النوع</label><select value={q.type} onChange={(e) => up(i, { type: e.target.value as Q["type"] })}>
              {Object.entries(LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div><label>الدرجة</label><input type="number" min={0.5} step={0.5} value={q.marks} onChange={(e) => up(i, { marks: e.target.value })} style={{ width: 80 }} /></div>
            <div style={{ flex: "2 1 200px" }}><label>الدرس (لتحليل القوة والضعف)</label><input value={q.lesson} onChange={(e) => up(i, { lesson: e.target.value })} placeholder="مثال: الجهاز العصبي" /></div>
          </div>
          <label>نص السؤال{q.type === "fill" ? " (اكتب ____ مكان كل فراغ)" : ""}</label>
          <textarea value={q.prompt} onChange={(e) => up(i, { prompt: e.target.value })} rows={2} />

          {q.type === "mcq" && (
            <div style={{ marginTop: 6 }}>
              <label>الخيارات (حدّد الإجابة الصحيحة بالدائرة)</label>
              {q.options.map((o, k) => (
                <div key={k} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <input type="radio" style={{ width: "auto" }} name={"c" + i} checked={q.correct === k} onChange={() => up(i, { correct: k })} />
                  <input value={o} onChange={(e) => up(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} placeholder={"الخيار " + (k + 1)} />
                </div>))}
              {q.options.length < 6 && <button className="ghost" type="button" onClick={() => up(i, { options: [...q.options, ""] })}>+ خيار</button>}
            </div>)}
          {q.type === "tf" && (
            <div style={{ display: "flex", gap: 18, marginTop: 6 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}><input type="radio" style={{ width: "auto" }} checked={q.tf} onChange={() => up(i, { tf: true })} />العبارة صحيحة</label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}><input type="radio" style={{ width: "auto" }} checked={!q.tf} onChange={() => up(i, { tf: false })} />العبارة خاطئة</label>
            </div>)}
          {q.type === "fill" && (<><label>الإجابات المقبولة: سطر لكل فراغ، وافصل البدائل بـ |</label>
            <textarea value={q.blanks} onChange={(e) => up(i, { blanks: e.target.value })} rows={2} placeholder={"الخلية | خلية"} /></>)}
          {q.type === "short" && (<><label>الإجابات المقبولة (افصل بينها بـ |). اتركها فارغة للتصحيح اليدوي</label>
            <input value={q.accepted} onChange={(e) => up(i, { accepted: e.target.value })} /></>)}
          {q.type === "essay" && (<><label>إجابة نموذجية (تظهر لك عند التصحيح)</label>
            <textarea value={q.model} onChange={(e) => up(i, { model: e.target.value })} rows={2} /></>)}
          <label>شرح الإجابة (اختياري، يظهر للطالب بعد التسليم)</label>
          <input value={q.explanation} onChange={(e) => up(i, { explanation: e.target.value })} />
        </div>))}

      <div className="card" style={{ marginTop: 14 }}>
        <button className="ghost" onClick={() => setQs([...qs, blank()])}>+ إضافة سؤال</button>{" "}
        <button disabled={busy} onClick={save}>{busy ? "جارٍ الحفظ…" : "حفظ الامتحان"}</button>
        <p className="err">{msg}</p>
        <p className="muted">أنواع المطابقة والسحب والترتيب والصور تُضاف من «استيراد الامتحانات».</p>
      </div>
    </>
  );
}
