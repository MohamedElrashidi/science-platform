import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { db, ownAttempt } from "@/lib/attempts";
import { gradeAnswer, describeKey } from "@/lib/grading";

// التحقق الفوري: يعمل فقط في اختبارات «وضع التدريب».
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("student");
  if ("err" in g) return g.err;
  const aid = Number((await params).id);
  const a = await ownAttempt(g.me, aid);
  if (!a) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const { data: e } = await db().from("exams").select("practice_mode").eq("id", a.exam_id).single();
  if (!e?.practice_mode) return NextResponse.json({ error: "هذا الاختبار لا يدعم التحقق الفوري" }, { status: 403 });
  if (a.status !== "in_progress") return NextResponse.json({ error: "تم تسليم هذه المحاولة" }, { status: 409 });
  const { question_id, answer } = await req.json().catch(() => ({}));
  const { data: r } = await db().from("attempt_answers").select("max_marks, questions(qtype, data, explanation)")
    .eq("attempt_id", aid).eq("question_id", Number(question_id)).maybeSingle();
  if (!r) return NextResponse.json({ error: "سؤال غير موجود" }, { status: 404 });
  const q: any = r.questions;
  const res = gradeAnswer(q.qtype, q.data, answer, Number(r.max_marks));
  if (res.needs_manual) return NextResponse.json({ manual: true });
  return NextResponse.json({ correct: Boolean(res.is_correct), marks: res.marks, max: r.max_marks,
    correct_text: describeKey(q.qtype, q.data), explanation: q.explanation });
}
