import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";
import { gradeAnswer, describeAnswer, describeKey } from "@/lib/grading";

// أسئلة محاولة طالب: صحيح (أخضر) / خطأ (أحمر) / لم يُجب، أثناء الامتحان وبعده
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const aid = Number((await params).id);
  const sb = await createClient();   // RLS: محاولات امتحانات المعلم فقط
  const { data: a } = await sb.from("attempts").select("*").eq("id", aid).maybeSingle();
  if (!a) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const { data: rows } = await sb.from("attempt_answers").select("question_id, answer, max_marks, marks_awarded, is_correct, needs_manual, questions(qtype, prompt, data)").eq("attempt_id", aid);
  const { data: eq } = await sb.from("exam_questions").select("question_id, position").eq("exam_id", a.exam_id);
  const pos = new Map<number, number>((eq || []).map((r: any) => [r.question_id, r.position] as [number, number]));
  const out = (rows || []).sort((x: any, y: any) => (pos.get(x.question_id) ?? 0) - (pos.get(y.question_id) ?? 0)).map((r: any, i: number) => {
    const q = r.questions, ans = r.answer;
    const empty = ans === null || ans === "" || (Array.isArray(ans) && !ans.length) || (typeof ans === "object" && !Array.isArray(ans) && !Object.keys(ans).length);
    let state: "correct" | "wrong" | "manual" | "none" = "none";
    if (!empty) {
      if (a.status !== "in_progress" && r.marks_awarded !== null) state = Number(r.marks_awarded) >= Number(r.max_marks) ? "correct" : "wrong";
      else { const gr = gradeAnswer(q.qtype, q.data, ans, Number(r.max_marks)); state = gr.needs_manual ? "manual" : gr.is_correct ? "correct" : "wrong"; }
      if (a.status !== "in_progress" && r.needs_manual && r.marks_awarded === null) state = "manual";
    }
    return { no: i + 1, prompt: q.prompt, state, mine: empty ? "" : describeAnswer(q.qtype, q.data, ans), key: describeKey(q.qtype, q.data) };
  });
  return NextResponse.json({ status: a.status, current: a.current_q, questions: out });
}
