import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await ctx.params).id);
  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("*").eq("id", id).maybeSingle();
  if (!exam) return NextResponse.json({ error: "الامتحان غير موجود" }, { status: 404 });
  const { data: eq } = await supabase.from("exam_questions")
    .select("position, marks, questions(id, qtype, prompt, status, explanation, data)").eq("exam_id", id).order("position");
  const questions = (eq || []).map((r: any) => {
    const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
    return { ...q, marks: r.marks, position: r.position };
  });
  const { data: asg } = await supabase.from("exam_assignments").select("id, class_id, student_id, classes(name), profiles(full_name)").eq("exam_id", id);
  const assignments = (asg || []).map((a: any) => ({
    id: a.id, class_id: a.class_id, student_id: a.student_id,
    name: a.student_id ? "طالب: " + ((Array.isArray(a.profiles) ? a.profiles[0] : a.profiles)?.full_name ?? "—") : (Array.isArray(a.classes) ? a.classes[0] : a.classes)?.name ?? "—",
  }));
  return NextResponse.json({ exam, questions, assignments });
}

// الإجراءات: approve | publish | unpublish | assign | unassign
export async function POST(req: Request, ctx: Ctx) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await ctx.params).id);
  const b = await req.json().catch(() => ({}));
  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("id, status").eq("id", id).maybeSingle();
  if (!exam) return NextResponse.json({ error: "الامتحان غير موجود" }, { status: 404 });

  const qIds = async () => ((await supabase.from("exam_questions").select("question_id").eq("exam_id", id)).data || []).map((r: any) => r.question_id);

  if (b.action === "approve") {
    const ids = await qIds();
    if (ids.length) await supabase.from("questions").update({ status: "approved" }).in("id", ids).eq("status", "pending_review");
    return NextResponse.json({ ok: true });
  }
  if (b.action === "publish") {
    const ids = await qIds();
    if (!ids.length) return NextResponse.json({ error: "لا توجد أسئلة في الامتحان" }, { status: 400 });
    const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).in("id", ids).eq("status", "pending_review");
    if ((count ?? 0) > 0) return NextResponse.json({ error: `اعتمد الأسئلة أولاً (${count} بانتظار الاعتماد)` }, { status: 409 });
    await supabase.from("exams").update({ status: "published" }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "unpublish") {
    await supabase.from("exams").update({ status: "draft" }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "assign") {
    const cids = Array.from(new Set([...(Array.isArray(b.class_ids) ? b.class_ids : []), ...(b.class_id !== undefined ? [b.class_id] : [])].map(Number).filter(Number.isInteger)));
    const sids = Array.from(new Set((Array.isArray(b.student_ids) ? b.student_ids : []).map(String))) as string[];
    if (!cids.length && !sids.length) return NextResponse.json({ error: "اختر صفًا أو طالبًا" }, { status: 400 });
    const okC = cids.length ? (await supabase.from("classes").select("id").in("id", cids)).data || [] : [];   // RLS: صفوفه فقط
    if (okC.length !== cids.length) return NextResponse.json({ error: "أحد الصفوف غير متاح لك" }, { status: 403 });
    const okS = sids.length ? (await supabase.from("profiles").select("id").eq("role", "student").in("id", sids)).data || [] : [];
    if (okS.length !== sids.length) return NextResponse.json({ error: "أحد الطلاب غير متاح لك" }, { status: 403 });
    const { data: cur } = await supabase.from("exam_assignments").select("class_id, student_id").eq("exam_id", id);
    const haveC = new Set((cur || []).map((c: any) => c.class_id)), haveS = new Set((cur || []).map((c: any) => c.student_id));
    const rows = [...cids.filter((c) => !haveC.has(c)).map((c) => ({ exam_id: id, class_id: c })), ...sids.filter((x) => !haveS.has(x)).map((x) => ({ exam_id: id, student_id: x }))];
    if (rows.length) await supabase.from("exam_assignments").insert(rows);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "set_release") {
    if (!["auto", "manual"].includes(b.mode)) return NextResponse.json({ error: "قيمة غير صحيحة" }, { status: 400 });
    const { error } = await supabase.from("exams").update({ release_mode: b.mode }).eq("id", id);
    return error ? NextResponse.json({ error: "تعذر الحفظ. هل شغّلت ملف 0007 في Supabase؟" }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (b.action === "release" || b.action === "hide") {
    // اعتماد (أو سحب) الدرجات: كل المحاولات المنتهية، أو محاولة واحدة attempt_id
    let q = supabase.from("attempts").update({ released_at: b.action === "release" ? new Date().toISOString() : null }).eq("exam_id", id).neq("status", "in_progress");
    if (b.attempt_id) q = q.eq("id", Number(b.attempt_id));
    const { error } = await q;
    return error ? NextResponse.json({ error: "تعذر الحفظ. هل شغّلت ملف 0007 في Supabase؟" }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (b.action === "unassign") {
    await supabase.from("exam_assignments").delete().eq("id", Number(b.assignment_id)).eq("exam_id", id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}

export async function DELETE(_: Request, ctx: Ctx) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await ctx.params).id);
  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("id").eq("id", id).maybeSingle();
  if (!exam) return NextResponse.json({ error: "الامتحان غير موجود" }, { status: 404 });
  const { count } = await supabase.from("attempts").select("id", { count: "exact", head: true }).eq("exam_id", id);
  if ((count ?? 0) > 0) return NextResponse.json({ error: "لا يمكن حذف امتحان له محاولات طلاب" }, { status: 409 });
  await supabase.from("exams").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
