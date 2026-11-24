import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeAnswer, studentView, shuffle, rng, type Q } from "@/lib/grading";
import type { Profile } from "@/lib/auth";

export const db = () => createAdminClient();
const GRACE_SAVE = 15_000, GRACE_SUBMIT = 45_000, MAX_ANSWER_CHARS = 20000;
export { GRACE_SAVE, GRACE_SUBMIT, MAX_ANSWER_CHARS };

export function windowOf(e: { starts_at: string | null; ends_at: string | null }, now = Date.now()) {
  if (e.starts_at && now < new Date(e.starts_at).getTime()) return "upcoming";
  if (e.ends_at && now > new Date(e.ends_at).getTime()) return "closed";
  return "open";
}

/** الاختبار المنشور والمسند لهذا الطالب (مباشرة أو عبر صفه). */
export async function assignedExam(me: Profile, examId: number) {
  const d = db();
  const { data: e } = await d.from("exams").select("*").eq("id", examId).eq("status", "published").maybeSingle();
  if (!e) return null;
  const { data: a } = await d.from("exam_assignments").select("id")
    .eq("exam_id", examId).or(`student_id.eq.${me.id}${me.class_id ? `,class_id.eq.${me.class_id}` : ""}`).limit(1);
  return a && a.length ? e : null;
}

export async function ownAttempt(me: Profile, aid: number) {
  const { data: a } = await db().from("attempts").select("*").eq("id", aid).eq("student_id", me.id).maybeSingle();
  return a ? expireIfNeeded(a) : null;
}

/** يصحح كل أسئلة المحاولة ويحسب المجموع. آمن للتكرار، ولا يمس الدرجات اليدوية المعتمدة. */
export async function gradeAttempt(aid: number) {
  const d = db();
  const { data: rows } = await d.from("attempt_answers")
    .select("question_id, answer, max_marks, questions(qtype, data)").eq("attempt_id", aid);
  for (const r of (rows || []) as any[]) {
    const g = gradeAnswer(r.questions.qtype, r.questions.data, r.answer, Number(r.max_marks));
    await d.from("attempt_answers").update({ marks_awarded: g.marks, is_correct: g.is_correct, needs_manual: g.needs_manual })
      .eq("attempt_id", aid).eq("question_id", r.question_id);
  }
  await recompute(aid);
}

export async function recompute(aid: number) {
  const d = db();
  const { data: rows } = await d.from("attempt_answers").select("marks_awarded, max_marks, needs_manual, is_correct").eq("attempt_id", aid);
  let s = 0, m = 0, pending = false;
  for (const r of rows || []) { s += Number(r.marks_awarded || 0); m += Number(r.max_marks || 0); if (r.needs_manual && r.marks_awarded === null) pending = true; }
  const pct = m ? Math.round((10000 * s) / m) / 100 : 0;
  await d.from("attempts").update({ score: Math.round(s * 100) / 100, total: m, percent: pct, status: pending ? "submitted" : "graded" })
    .eq("id", aid).neq("status", "in_progress");
}

export async function finalize(aid: number) {
  const { data } = await db().from("attempts").update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", aid).eq("status", "in_progress").select("id");
  if (data && data.length) await gradeAttempt(aid);
}

export async function expireIfNeeded(a: any) {
  if (a.status === "in_progress" && a.deadline_at && Date.now() > new Date(a.deadline_at).getTime() + GRACE_SUBMIT) {
    await finalize(a.id);
    const { data } = await db().from("attempts").select("*").eq("id", a.id).single();
    return data;
  }
  return a;
}

export async function storeAnswers(a: any, answers: unknown, grace: number) {
  if (a.deadline_at && Date.now() > new Date(a.deadline_at).getTime() + grace) return false;
  const d = db();
  const { data: valid } = await d.from("attempt_answers").select("question_id").eq("attempt_id", a.id);
  const ok = new Set((valid || []).map((r) => String(r.question_id)));
  const entries = Object.entries(answers && typeof answers === "object" ? (answers as Record<string, unknown>) : {});
  for (const [k, v] of entries) {
    if (!ok.has(k) || JSON.stringify(v).length > MAX_ANSWER_CHARS) continue;
    await d.from("attempt_answers").update({ answer: v, updated_at: new Date().toISOString() }).eq("attempt_id", a.id).eq("question_id", Number(k));
  }
  return true;
}

/** رابط مؤقت للصور المخزنة (storage:bucket/path). */
export async function signMedia(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const m = /^storage:([^/]+)\/(.+)$/.exec(url);
  if (!m) return null;                       // media:… لم تُرفع صورته
  const { data } = await db().storage.from(m[1]).createSignedUrl(m[2], 3600);
  return data?.signedUrl ?? null;
}

export async function questionsFor(a: any, e: any) {
  const { data } = await db().from("exam_questions")
    .select("position, marks, questions(id, qtype, prompt, instructions, media_kind, media_url, data, explanation)")
    .eq("exam_id", e.id).order("position");
  const qs: Q[] = (data || []).map((r: any) => ({ ...r.questions, marks: Number(r.marks) }));
  let views = qs.map((q) => studentView(q, a.seed, e.shuffle_options));
  if (e.shuffle_questions) views = shuffle(views, rng(String(a.seed)));
  return Promise.all(views.map(async (v) => ({ ...v, media_url: await signMedia(v.media_url) })));
}

export async function payload(a: any, e: any) {
  const { data: ans } = await db().from("attempt_answers").select("question_id, answer").eq("attempt_id", a.id);
  const answers: Record<string, unknown> = {};
  (ans || []).forEach((r) => { if (r.answer !== null) answers[String(r.question_id)] = r.answer; });
  const rem = a.deadline_at ? Math.max(0, Math.floor((new Date(a.deadline_at).getTime() - Date.now()) / 1000)) : null;
  return {
    attempt: { id: a.id, status: a.status, attempt_no: a.attempt_no, remaining_seconds: rem },
    exam: { id: e.id, title: e.title, kind: e.kind, description: e.description, duration_minutes: e.duration_minutes, practice_mode: e.practice_mode },
    answers,
    ...(a.status === "in_progress" ? { questions: await questionsFor(a, e) } : {}),
  };
}
