import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";

// نتائج امتحان: كل القراءة تحت RLS، فيرى المعلم نتائج امتحاناته فقط.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await params).id);
  const sb = await createClient();
  const { data: exam } = await sb.from("exams").select("id, title, kind, grade_level, status, max_attempts").eq("id", id).maybeSingle();
  if (!exam) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const { data: atts } = await sb.from("attempts")
    .select("id, student_id, attempt_no, status, score, total, percent, started_at, submitted_at").eq("exam_id", id).order("submitted_at", { ascending: false });
  const sids = Array.from(new Set((atts || []).map((a) => a.student_id)));
  const { data: studs } = sids.length ? await sb.from("profiles").select("id, full_name, class_id").in("id", sids) : { data: [] as any[] };
  const { data: cls } = await sb.from("classes").select("id, name");
  const sm = new Map((studs || []).map((s: any) => [s.id, s])), cm = new Map((cls || []).map((c) => [c.id, c.name]));
  const aids = (atts || []).filter((a) => a.status !== "in_progress").map((a) => a.id);
  const { data: ans } = aids.length ? await sb.from("attempt_answers").select("question_id, is_correct, marks_awarded, max_marks, needs_manual").in("attempt_id", aids) : { data: [] as any[] };
  const { data: eq } = await sb.from("exam_questions").select("question_id, position, questions(prompt, qtype)").eq("exam_id", id).order("position");
  const per = new Map<number, { n: number; ok: number }>();
  (ans || []).forEach((r: any) => { if (r.is_correct === null && r.marks_awarded === null) return; const p = per.get(r.question_id) || { n: 0, ok: 0 }; p.n++; if (r.is_correct || Number(r.marks_awarded) >= Number(r.max_marks)) p.ok++; per.set(r.question_id, p); });
  return NextResponse.json({
    exam,
    attempts: (atts || []).map((a) => ({ ...a, student: sm.get(a.student_id)?.full_name ?? "—", class: cm.get(sm.get(a.student_id)?.class_id) ?? "—" })),
    questions: (eq || []).map((r: any, i: number) => ({ id: r.question_id, no: i + 1, prompt: r.questions?.prompt, qtype: r.questions?.qtype,
      rate: per.get(r.question_id) ? Math.round((100 * per.get(r.question_id)!.ok) / per.get(r.question_id)!.n) : null, n: per.get(r.question_id)?.n ?? 0 })),
  });
}
