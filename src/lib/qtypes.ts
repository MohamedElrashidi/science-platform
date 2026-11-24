// تحويل أسئلة صيغة الاستيراد (سهلة الكتابة) إلى البنية الداخلية التي يصححها الخادم، مع التحقق.
// لا يستورد أي مكتبة خادم، فيصلح للاختبار وللواجهة.

export const TYPE_LABELS: Record<string, string> = {
  mcq: "اختيار من متعدد", tf: "صح وخطأ", fill: "إكمال", short: "إجابة قصيرة",
  matching: "مطابقة", dragdrop: "سحب وإفلات", ordering: "ترتيب", essay: "مقالي",
};

const ALIASES: Record<string, string> = {
  mcq: "mcq", multiple_choice: "mcq", choice: "mcq", "اختيار": "mcq",
  tf: "tf", true_false: "tf", truefalse: "tf",
  fill: "fill", fill_blank: "fill", cloze: "fill",
  short: "short", short_answer: "short",
  matching: "matching", match: "matching",
  dragdrop: "dragdrop", drag_drop: "dragdrop", classify: "dragdrop", sorting: "dragdrop",
  ordering: "ordering", order: "ordering", sequence: "ordering",
  essay: "essay", long: "essay", open: "essay",
};

export type Converted = {
  qtype: string; prompt: string; instructions: string | null; data: any;
  marks: number; explanation: string | null; difficulty: string;
  media_kind: string | null; media_url: string | null; lesson: string | null;
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const optText = (o: any) => (o && typeof o === "object" ? str(o.text ?? o.label) : str(o));

/** يحوّل صيغة 2.0 (answer_key / points / media) إلى الصيغة المبسّطة، دون تغيير الصيغة القديمة. */
function normalizeQ(q: any): any {
  if (!q || typeof q !== "object") return q;
  const o: any = { ...q };
  const ak = q.answer_key;
  if (ak && typeof ak === "object") {
    if (o.correct === undefined) {
      if (ak.correct_index !== undefined) o.correct = ak.correct_index;
      else if (ak.correct_indices !== undefined) o.correct = ak.correct_indices;
      else if (ak.correct !== undefined) o.correct = ak.correct;
    }
    if (o.explanation === undefined && ak.explanation) o.explanation = ak.explanation;
  }
  if (o.marks === undefined && q.points !== undefined) o.marks = q.points;
  if (o.difficulty === undefined && q.meta?.difficulty) o.difficulty = q.meta.difficulty;
  return o;
}

/** يعيد {ok} أو {error} برسالة عربية مع رقم السؤال. */
export function convertQuestion(q0: any, n: number): { ok: Converted } | { error: string } {
  const fail = (m: string) => ({ error: `السؤال ${n}: ${m}` });
  if (!q0 || typeof q0 !== "object") return fail("بنية غير صحيحة");
  const q = normalizeQ(q0);
  const qtype = ALIASES[str(q.type ?? q.qtype).toLowerCase()];
  if (!qtype) return fail(`نوع غير معروف «${str(q.type ?? q.qtype)}»`);
  const prompt = str(q.prompt ?? q.question ?? q.text);
  if (!prompt) return fail("نص السؤال فارغ");

  let data: any = {};
  if (qtype === "mcq") {
    const raw = Array.isArray(q.options) ? q.options : [];
    const texts = raw.map(optText);
    if (texts.length < 2 || texts.some((t: string) => !t)) return fail("يلزم خياران على الأقل وبلا خيار فارغ");
    const rc = Array.isArray(q.correct) ? q.correct : q.correct === undefined || q.correct === null ? [] : [q.correct];
    const idx = new Set<number>();
    for (const c of rc) {
      if (typeof c === "number" && Number.isInteger(c) && c >= 0 && c < texts.length) idx.add(c);
      else { const k = texts.indexOf(str(c)); if (k >= 0) idx.add(k); }   // أو نص الخيار نفسه
    }
    if (!idx.size) return fail("الإجابة الصحيحة غير محددة أو خارج الخيارات (الترقيم يبدأ من 0)");
    data = { options: texts.map((text: string, i: number) => ({ id: String(i), text })),
             correct: Array.from(idx).map(String), multiple: idx.size > 1 || q.multiple === true };
  } else if (qtype === "tf") {
    const c = q.correct;
    const v = typeof c === "boolean" ? c : ["true", "صح", "صحيحة", "1"].includes(str(c).toLowerCase()) ? true
            : ["false", "خطأ", "خاطئة", "0"].includes(str(c).toLowerCase()) ? false : null;
    if (v === null) return fail("حدّد هل العبارة صحيحة أم خاطئة (true/false)");
    data = { correct: v };
  } else if (qtype === "fill") {
    const raw = Array.isArray(q.blanks) ? q.blanks : Array.isArray(q.answers) ? q.answers : [];
    const blanks = raw.map((b: any) => (Array.isArray(b) ? strList(b) : [str(b)].filter(Boolean)));
    if (!blanks.length || blanks.some((b: string[]) => !b.length)) return fail("أضف الإجابات المقبولة لكل فراغ");
    data = { blanks };
  } else if (qtype === "short") {
    data = { accepted: strList(q.accepted ?? q.answers) };   // فارغة = تصحيح يدوي
  } else if (qtype === "matching") {
    let pairs: { left: string; right: string }[] = [];
    if (Array.isArray(q.pairs)) pairs = q.pairs.map((p: any) => ({ left: str(p?.left), right: str(p?.right) }));
    else if (q.pairs && typeof q.pairs === "object") pairs = Object.entries(q.pairs).map(([l, r]) => ({ left: str(l), right: str(r) }));
    if (pairs.length < 2 || pairs.some((p) => !p.left || !p.right)) return fail("أضف زوجين على الأقل للمطابقة");
    data = { pairs };
  } else if (qtype === "dragdrop") {
    const targets = strList(q.targets ?? q.groups);
    const items = (Array.isArray(q.items) ? q.items : []).map((it: any) => {
      const t = it?.target;
      const ti = typeof t === "number" ? t : targets.indexOf(str(t));
      return { text: str(it?.text), target: ti };
    });
    if (targets.length < 2 || items.length < 2) return fail("أضف مجموعتين وعنصرين على الأقل");
    if (items.some((it: any) => !it.text || it.target < 0 || it.target >= targets.length)) return fail("عنصر بلا نص أو مجموعة غير موجودة");
    data = { targets, items };
  } else if (qtype === "ordering") {
    const items = strList(q.items);
    if (items.length < 2) return fail("أضف عنصرين على الأقل للترتيب (بالترتيب الصحيح)");
    data = { items };
  } else {
    data = { model_answer: str(q.model_answer ?? q.answer) || null };
  }

  const marks = q.marks === undefined ? 1 : Number(q.marks);
  if (!Number.isFinite(marks) || marks <= 0 || marks > 100) return fail("الدرجة غير صحيحة");
  const m = q.media && typeof q.media === "object" ? q.media : null;
  // صورة مرفوعة (storage:) أو اسم ملف سيُربط عند الاستيراد (media:) أو رابط http
  const img = str(q.image ?? q.media_url ?? m?.url ?? (m?.file ? `media:${m.file}` : ""));
  if (img && !/^(https?:\/\/|storage:|media:)/i.test(img)) return fail("رابط الصورة يجب أن يبدأ بـ http أو https");
  if (m?.alt) data = { ...data, media_alt: str(m.alt) };
  const diff = ["easy", "medium", "hard"].includes(str(q.difficulty)) ? str(q.difficulty) : "medium";
  return { ok: {
    qtype, prompt, instructions: str(q.instructions) || null, data, marks,
    explanation: str(q.explanation) || null, difficulty: diff,
    media_kind: img ? "image" : null, media_url: img || null, lesson: str(q.lesson) || null,
  } };
}

export type ExamIn = {
  title: string; kind: string; subject: string | null; lesson: string | null; grade_level: string | null;
  description: string | null; duration_minutes: number | null; max_attempts: number;
  shuffle_questions: boolean; shuffle_options: boolean; show_answers: boolean; show_score: boolean; practice_mode: boolean;
  questions: Converted[];
};

const KINDS = ["exam", "quiz", "homework", "worksheet", "activity", "revision", "final"];

/** صيغة 2.0: {exam:{title,grade,subject,settings,…}, questions:[…]} → الصيغة المسطّحة. */
export function normalizeExam(x0: any): any {
  if (!x0 || typeof x0 !== "object" || !x0.exam || typeof x0.exam !== "object") return x0;
  const e = x0.exam, st = e.settings && typeof e.settings === "object" ? e.settings : {};
  return {
    title: e.title, kind: e.kind, subject: e.subject, grade_level: e.grade_level ?? e.grade,
    lesson: e.lesson, description: e.description, duration_minutes: e.duration_minutes,
    max_attempts: st.max_attempts ?? e.max_attempts,
    shuffle_questions: st.shuffle_questions, shuffle_options: st.shuffle_options,
    show_answers: st.show_review_after_finish ?? st.show_answers,
    questions: x0.questions,
  };
}

export function convertExam(x0: any): { ok: ExamIn } | { errors: string[] } {
  const errors: string[] = [];
  if (!x0 || typeof x0 !== "object") return { errors: ["بنية الملف غير صحيحة"] };
  const x = normalizeExam(x0);
  const title = str(x.title);
  if (!title) errors.push("عنوان الامتحان مفقود");
  const list = Array.isArray(x.questions) ? x.questions : [];
  if (!list.length) errors.push("لا توجد أسئلة");
  if (list.length > 200) errors.push("الحد الأقصى 200 سؤال للامتحان");
  const questions: Converted[] = [];
  list.slice(0, 200).forEach((q: any, i: number) => {
    const r = convertQuestion(q, i + 1);
    if ("error" in r) errors.push(r.error); else questions.push(r.ok);
  });
  const dm = x.duration_minutes === undefined || x.duration_minutes === null || x.duration_minutes === "" ? null : Number(x.duration_minutes);
  if (dm !== null && (!Number.isFinite(dm) || dm < 1 || dm > 600)) errors.push("مدة الامتحان غير صحيحة");
  const ma = x.max_attempts === undefined ? 1 : Number(x.max_attempts);
  if (!Number.isInteger(ma) || ma < 1 || ma > 50) errors.push("عدد المحاولات غير صحيح");
  if (errors.length) return { errors };
  const kind = KINDS.includes(str(x.kind)) ? str(x.kind) : "exam";
  const flag = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  return { ok: {
    title, kind, subject: str(x.subject) || null, lesson: str(x.lesson) || null,
    grade_level: str(x.grade_level ?? x.grade) || null, description: str(x.description) || null,
    duration_minutes: dm, max_attempts: ma,
    shuffle_questions: flag(x.shuffle_questions, false), shuffle_options: flag(x.shuffle_options, false),
    show_answers: flag(x.show_answers, true), show_score: flag(x.show_score, true), practice_mode: flag(x.practice_mode, false),
    questions,
  } };
}
