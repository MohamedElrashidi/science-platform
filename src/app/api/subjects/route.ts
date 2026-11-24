import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";

export async function GET() {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("name");
  const { data: lessons } = await supabase.from("lessons").select("id, subject_id, title, grade_level").order("id");
  return NextResponse.json({ subjects: subjects || [], lessons: lessons || [] });
}

export async function POST(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const b = await req.json().catch(() => ({}));
  const supabase = await createClient();   // سياسة الكتابة للمعلمين
  if (b.kind === "lesson") {
    const title = String(b.title || "").trim();
    if (!title || !b.subject_id) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    const { error } = await supabase.from("lessons").insert({ subject_id: Number(b.subject_id), title, grade_level: b.grade_level || null });
    return error ? NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 }) : NextResponse.json({ ok: true }, { status: 201 });
  }
  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "اسم المادة مطلوب" }, { status: 400 });
  const { error } = await supabase.from("subjects").insert({ name });
  return error ? NextResponse.json({ error: "المادة موجودة أو تعذر الحفظ" }, { status: 409 }) : NextResponse.json({ ok: true }, { status: 201 });
}
