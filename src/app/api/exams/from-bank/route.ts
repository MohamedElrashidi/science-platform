import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";

// إنشاء امتحان من أسئلة معتمدة في البنك + إسناده لصفوف/طلاب (+ نشره اختياريًا)
export async function POST(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const b = await req.json().catch(() => ({}));
  const title = String(b.title || "").trim();
  const ids: number[] = Array.from(new Set((Array.isArray(b.question_ids) ? b.question_ids : []).map(Number).filter(Number.isInteger))) as number[];
  if (title.length < 2) return NextResponse.json({ error: "اكتب عنوان الامتحان" }, { status: 400 });
  if (!ids.length || ids.length > 200) return NextResponse.json({ error: "اختر من 1 إلى 200 سؤال" }, { status: 400 });
  const dm = b.duration_minutes ? Number(b.duration_minutes) : null;
  if (dm !== null && (!Number.isFinite(dm) || dm < 1 || dm > 600)) return NextResponse.json({ error: "مدة الامتحان غير صحيحة" }, { status: 400 });
  const ma = Number(b.max_attempts) || 1;
  if (!Number.isInteger(ma) || ma < 1 || ma > 50) return NextResponse.json({ error: "عدد المحاولات غير صحيح" }, { status: 400 });

  const sb = await createClient();
  const { data: qs } = await sb.from("questions").select("id, marks, status, subject_id").in("id", ids);
  if (!qs || qs.length !== ids.length) return NextResponse.json({ error: "بعض الأسئلة غير متاحة لك" }, { status: 403 });
  if (qs.some((q: any) => q.status !== "approved")) return NextResponse.json({ error: "اختر أسئلة معتمدة فقط" }, { status: 400 });
  const byId = new Map<number, any>(qs.map((q: any) => [q.id, q]));

  const cids = Array.from(new Set((Array.isArray(b.class_ids) ? b.class_ids : []).map(Number).filter(Number.isInteger))) as number[];
  const sids = Array.from(new Set((Array.isArray(b.student_ids) ? b.student_ids : []).map(String))) as string[];
  const okC = cids.length ? (await sb.from("classes").select("id").in("id", cids)).data || [] : [];
  if (okC.length !== cids.length) return NextResponse.json({ error: "أحد الصفوف غير متاح لك" }, { status: 403 });
  const okS = sids.length ? (await sb.from("profiles").select("id").eq("role", "student").in("id", sids)).data || [] : [];
  if (okS.length !== sids.length) return NextResponse.json({ error: "أحد الطلاب غير متاح لك" }, { status: 403 });

  const { data: dup } = await sb.from("exams").select("id").eq("owner_id", g.me.id).eq("title", title).maybeSingle();
  if (dup) return NextResponse.json({ error: "يوجد امتحان بنفس العنوان" }, { status: 409 });

  const publish = b.publish === true && (cids.length > 0 || sids.length > 0);
  const flag = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  const { data: exam, error } = await sb.from("exams").insert({
    owner_id: g.me.id, title, kind: "exam", subject_id: byId.get(ids[0])?.subject_id ?? null, grade_level: String(b.grade_level || "").trim() || null,
    description: null, duration_minutes: dm, max_attempts: ma,
    shuffle_questions: flag(b.shuffle_questions, false), shuffle_options: flag(b.shuffle_options, true),
    show_answers: flag(b.show_answers, true), show_score: flag(b.show_score, true), practice_mode: false, status: publish ? "published" : "draft",
  }).select("id").single();
  if (error || !exam) return NextResponse.json({ error: "تعذر إنشاء الامتحان" }, { status: 500 });

  const { error: lErr } = await sb.from("exam_questions").insert(ids.map((id, i) => ({ exam_id: exam.id, question_id: id, position: i, marks: Number(byId.get(id).marks) || 1 })));
  if (lErr) { await sb.from("exams").delete().eq("id", exam.id); return NextResponse.json({ error: "تعذر ربط الأسئلة" }, { status: 500 }); }

  const rows = [...cids.map((c) => ({ exam_id: exam.id, class_id: c })), ...sids.map((s) => ({ exam_id: exam.id, student_id: s }))];
  if (rows.length) await sb.from("exam_assignments").insert(rows);
  return NextResponse.json({ id: exam.id, published: publish }, { status: 201 });
}
