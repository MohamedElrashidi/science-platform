import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";
import { recompute } from "@/lib/attempts";
import { describeAnswer, describeKey } from "@/lib/grading";

// تفاصيل محاولة لتصحيحها (للمعلم صاحب الاختبار أو المدير).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await params).id);
  const sb = await createClient();
  const { data: a } = await sb.from("attempts").select("id, status, score, total, percent").eq("id", id).maybeSingle();
  if (!a) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const { data } = await sb.from("attempt_answers")
    .select("question_id, answer, marks_awarded, max_marks, is_correct, needs_manual, feedback, questions(qtype, prompt, data)").eq("attempt_id", id);
  return NextResponse.json({ attempt: a, answers: (data || []).map((r: any) => ({
    question_id: r.question_id, prompt: r.questions.prompt, qtype: r.questions.qtype, marks: r.marks_awarded, max: r.max_marks,
    is_correct: r.is_correct, needs_manual: r.needs_manual, feedback: r.feedback,
    mine: describeAnswer(r.questions.qtype, r.questions.data, r.answer), key: describeKey(r.questions.qtype, r.questions.data) })) });
}

// تصحيح يدوي لسؤال: درجة وملاحظة.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await params).id);
  const b = await req.json().catch(() => ({}));
  const sb = await createClient();
  const { data: r } = await sb.from("attempt_answers").select("max_marks").eq("attempt_id", id).eq("question_id", Number(b.question_id)).maybeSingle();
  if (!r) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const marks = Number(b.marks);
  if (!Number.isFinite(marks) || marks < 0 || marks > Number(r.max_marks)) return NextResponse.json({ error: `الدرجة بين 0 و${r.max_marks}` }, { status: 400 });
  const { error } = await sb.from("attempt_answers").update({ marks_awarded: marks, is_correct: marks >= Number(r.max_marks), feedback: b.feedback ? String(b.feedback).slice(0, 1000) : null })
    .eq("attempt_id", id).eq("question_id", Number(b.question_id));
  if (error) return NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 });
  await recompute(id);
  return NextResponse.json({ ok: true });
}
