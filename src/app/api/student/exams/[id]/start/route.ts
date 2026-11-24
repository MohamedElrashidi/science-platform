import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { db, assignedExam, expireIfNeeded, payload, windowOf } from "@/lib/attempts";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("student");
  if ("err" in g) return g.err;
  const eid = Number((await params).id);
  const e = await assignedExam(g.me, eid);
  if (!e) return NextResponse.json({ error: "هذا الاختبار غير متاح لك" }, { status: 404 });
  const d = db();

  // محاولة جارية: نكملها
  const { data: cur } = await d.from("attempts").select("*").eq("exam_id", eid).eq("student_id", g.me.id).eq("status", "in_progress").maybeSingle();
  if (cur) { const a = await expireIfNeeded(cur); if (a.status === "in_progress") return NextResponse.json(await payload(a, e)); }

  const w = windowOf(e);
  if (w === "upcoming") return NextResponse.json({ error: "لم يبدأ وقت الاختبار بعد" }, { status: 403 });
  if (w === "closed") return NextResponse.json({ error: "انتهى وقت الاختبار" }, { status: 403 });
  const { data: prev } = await d.from("attempts").select("attempt_no").eq("exam_id", eid).eq("student_id", g.me.id);
  const used = prev?.length ?? 0, maxNo = Math.max(0, ...(prev || []).map((p) => p.attempt_no));
  if (used >= e.max_attempts) return NextResponse.json({ error: "استنفدت عدد المحاولات المسموحة" }, { status: 403 });

  const { data: qs } = await d.from("exam_questions").select("question_id, marks").eq("exam_id", eid);
  if (!qs || !qs.length) return NextResponse.json({ error: "الاختبار لا يحتوي أسئلة" }, { status: 400 });
  // لا يُقدَّم إلا الأسئلة المعتمدة
  const { data: ok } = await d.from("questions").select("id").in("id", qs.map((q) => q.question_id)).eq("status", "approved");
  const okSet = new Set((ok || []).map((q) => q.id));
  const use = qs.filter((q) => okSet.has(q.question_id));
  if (!use.length) return NextResponse.json({ error: "أسئلة هذا الاختبار لم تُعتمد بعد" }, { status: 400 });

  const now = Date.now();
  let deadline: number | null = e.duration_minutes ? now + e.duration_minutes * 60000 : null;
  if (e.ends_at) { const end = new Date(e.ends_at).getTime(); deadline = deadline ? Math.min(deadline, end) : end; }
  const { data: att, error } = await d.from("attempts").insert({
    exam_id: eid, student_id: g.me.id, attempt_no: maxNo + 1, seed: Math.floor(Math.random() * 1e9),
    started_at: new Date(now).toISOString(), deadline_at: deadline ? new Date(deadline).toISOString() : null,
    total: use.reduce((s, q) => s + Number(q.marks), 0),
  }).select("*").single();
  if (error || !att) return NextResponse.json({ error: "تعذّر بدء المحاولة، أعد المحاولة" }, { status: 409 });
  await d.from("attempt_answers").insert(use.map((q) => ({ attempt_id: att.id, question_id: q.question_id, max_marks: q.marks })));
  return NextResponse.json(await payload(att, e), { status: 201 });
}
