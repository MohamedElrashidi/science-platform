"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { FONTS, styleCss } from "@/lib/qtypes";

type Q = {
  type: "mcq" | "tf" | "fill" | "short" | "essay"; prompt: string; marks: string; lesson: string; explanation: string;
  options: string[]; correct: number; tf: boolean; blanks: string; accepted: string; model: string;
  section: string; passage: string; image: string; preview: string; font: string; size: string; color: string; bold: boolean; scope: string; timer: string;
};
type Cls = { id: number; name: string };
const blank = (scope = ""): Q => ({ type: "mcq", prompt: "", marks: "1", lesson: "", explanation: "", options: ["", "", "", ""], correct: 0, tf: true, blanks: "", accepted: "", model: "",
  section: "", passage: "", image: "", preview: "", font: "cairo", size: "21", color: "#142b45", bold: true, scope, timer: "" });
const LABEL = { mcq: "اختيار من متعدد", tf: "صح وخطأ", fill: "إكمال الفراغ", short: "إجابة قصيرة", essay: "مقالي (تصحيح يدوي)" };
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

export default function NewExam() {
  const [f, setF] = useState({ title: "", subject: "العلوم", lesson: "", grade: "", duration: "", attempts: "1", show_answers: true, show_score: true, shuffle_questions: false, shuffle_options: true, scope: "", single: false, release: "auto" });
  const [qs, setQs] = useState<Q[]>([blank()]);
  const [classes, setClasses] = useState<Cls[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [upFor, setUpFor] = useState(-1);
  useEffect(() => { api<Cls[]>("/api/classes").then(setClasses).catch(() => {}); }, []);
  const up = (i: number, p: Partial<Q>) => setQs((a) => a.map((q, k) => (k === i ? { ...q, ...p } : q)));
  const move = (i: number, d: number) => setQs((a) => { const b = [...a], j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b; });

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    const i = upFor; if (!file || i < 0) return;
    const ext = EXT[file.type];
    if (!ext) { setMsg("الصورة يجب أن تكون PNG أو JPG أو WebP أو GIF"); return; }
    if (file.size > 4 * 1024 * 1024) { setMsg("الصورة أكبر من 4 ميغابايت"); return; }
    setMsg("جارٍ رفع الصورة…");
    const fd = new FormData(); fd.append("file", file); fd.append("path", `q/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
    try {
      const r = await fetch("/api/import/media", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "تعذر رفع الصورة");
      up(i, { image: j.url, preview: URL.createObjectURL(file) }); setMsg("");
    } catch (x: any) { setMsg(x.message); }
  }

  function toJson() {
    return {
      title: f.title.trim(), subject: f.subject.trim() || null, lesson: f.lesson.trim() || null, grade_level: f.grade.trim() || null,
      duration_minutes: f.duration ? Number(f.duration) : null, max_attempts: f.single ? 1 : Number(f.attempts) || 1, release_mode: f.release,
      show_answers: f.show_answers, show_score: f.show_score, shuffle_questions: f.shuffle_questions, shuffle_options: f.shuffle_options,
      questions: qs.map((q) => {
        const base: any = {
          type: q.type, prompt: q.prompt, marks: Number(q.marks) || 1, lesson: q.lesson.trim() || undefined, explanation: q.explanation.trim() || undefined,
          section: q.section.trim() || undefined, passage: q.passage.trim() || undefined, image: q.image || undefined,
          style: { font: q.font, size: Number(q.size), color: q.color, bold: q.bold }, scope_class: q.scope ? Number(q.scope) : undefined, time_limit: q.timer ? Number(q.timer) : undefined,
        };
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

  const scopeSel = (v: string, on: (v: string) => void) => (
    <select value={v} onChange={(e) => on(e.target.value)}>
      <option value="">عام (لكل الصفوف)</option>
      {classes.map((c) => <option key={c.id} value={c.id}>لصف: {c.name}</option>)}
    </select>);

  return (
    <>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={pickImage} />
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
          <div><label>عدد المحاولات</label><input type="number" min={1} disabled={f.single} value={f.single ? "1" : f.attempts} onChange={(e) => setF({ ...f, attempts: e.target.value })} style={{ width: 90 }} /></div>
          <label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}><input type="checkbox" style={{ width: "auto" }} checked={f.single} onChange={(e) => setF({ ...f, single: e.target.checked })} />محاولة واحدة فقط</label>
          <div><label>نشر الدرجات</label><select value={f.release} onChange={(e) => setF({ ...f, release: e.target.value })}><option value="auto">تلقائي: تظهر فور التسليم</option><option value="manual">يدوي: بعد اعتمادك</option></select></div>
          <div><label>نطاق كل الأسئلة</label>
            {scopeSel(f.scope, (v) => { setF({ ...f, scope: v }); setQs((a) => a.map((q) => ({ ...q, scope: v }))); })}</div>
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
            <span>
              <button className="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="أعلى">↑</button>{" "}
              <button className="ghost" onClick={() => move(i, 1)} disabled={i === qs.length - 1} aria-label="أسفل">↓</button>{" "}
              <button className="ghost" onClick={() => setQs((a) => [...a.slice(0, i + 1), { ...a[i], options: [...a[i].options] }, ...a.slice(i + 1)])}>نسخ</button>{" "}
              {qs.length > 1 && <button className="ghost" onClick={() => setQs(qs.filter((_, k) => k !== i))}>حذف</button>}
            </span></div>

          <label>عنوان قسم جديد يبدأ من هذا السؤال (اختياري)</label>
          <input value={q.section} onChange={(e) => up(i, { section: e.target.value })} placeholder="مثال: القسم الأول — الجهاز العصبي" />
          <label>فقرة أو نص للقراءة قبل السؤال (اختياري)</label>
          <textarea value={q.passage} onChange={(e) => up(i, { passage: e.target.value })} rows={3} />

          <div className="row" style={{ marginTop: 8 }}>
            <div><label>النوع</label><select value={q.type} onChange={(e) => up(i, { type: e.target.value as Q["type"] })}>
              {Object.entries(LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div><label>الدرجة</label><input type="number" min={0.5} step={0.5} value={q.marks} onChange={(e) => up(i, { marks: e.target.value })} style={{ width: 80 }} /></div>
            <div style={{ flex: "2 1 200px" }}><label>الدرس (لتحليل القوة والضعف)</label><input value={q.lesson} onChange={(e) => up(i, { lesson: e.target.value })} placeholder="مثال: الجهاز العصبي" /></div>
            <div><label>مؤقت السؤال (ثوانٍ، فارغ = بلا مؤقت)</label><input type="number" min={5} max={3600} value={q.timer} onChange={(e) => up(i, { timer: e.target.value })} style={{ width: 110 }} /></div>
            <div><label>يُضاف السؤال</label>{scopeSel(q.scope, (v) => up(i, { scope: v }))}</div>
          </div>

          <label>نص السؤال{q.type === "fill" ? " (اكتب ____ مكان كل فراغ)" : ""}</label>
          <div className="row" style={{ marginBottom: 6, alignItems: "end" }}>
            <div><label>الخط</label><select value={q.font} onChange={(e) => up(i, { font: e.target.value })}>{Object.entries(FONTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><label>الحجم</label><input type="number" min={14} max={40} value={q.size} onChange={(e) => up(i, { size: e.target.value })} style={{ width: 80 }} /></div>
            <div><label>اللون</label><input type="color" value={q.color} onChange={(e) => up(i, { color: e.target.value })} style={{ width: 60, padding: 2 }} /></div>
            <label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}><input type="checkbox" style={{ width: "auto" }} checked={q.bold} onChange={(e) => up(i, { bold: e.target.checked })} />عريض</label>
          </div>
          <textarea value={q.prompt} onChange={(e) => up(i, { prompt: e.target.value })} rows={2} />
          {q.prompt && <div className="passage" style={{ background: "var(--bg)", marginTop: 6 }}><span className="muted">معاينة: </span><span style={{ ...styleCss({ font: q.font === "cairo" ? undefined : q.font, size: Number(q.size), color: q.color, bold: q.bold }), fontWeight: q.bold ? 700 : 400 }}>{q.prompt}</span></div>}

          <div style={{ marginTop: 8 }}>
            {q.preview && <img src={q.preview} alt="" style={{ maxWidth: 260, maxHeight: 180, borderRadius: 10, display: "block", marginBottom: 6 }} />}
            <button type="button" className="ghost" onClick={() => { setUpFor(i); fileRef.current?.click(); }}>{q.image ? "تغيير الصورة" : "+ رفع صورة للسؤال"}</button>
            {q.image && <> <button type="button" className="ghost" onClick={() => up(i, { image: "", preview: "" })}>إزالة الصورة</button></>}
          </div>

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
        <button className="ghost" onClick={() => setQs([...qs, blank(f.scope)])}>+ إضافة سؤال</button>{" "}
        <button disabled={busy} onClick={save}>{busy ? "جارٍ الحفظ…" : "حفظ الامتحان"}</button>
        <p className="err">{msg}</p>
        <p className="muted">أنواع المطابقة والسحب والترتيب تُضاف من «استيراد الامتحانات». الخطوط المعروضة تعمل على أغلب الأجهزة، وقد يختلف شكلها قليلًا من جهاز لآخر.</p>
      </div>
    </>
  );
}
