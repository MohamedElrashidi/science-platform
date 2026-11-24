import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";

export async function GET() {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const supabase = await createClient();   // RLS: المعلم يرى صفوفه فقط
  const { data: classes } = await supabase.from("classes").select("id, name, grade_level").order("name");
  const { data: studs } = await supabase.from("profiles").select("class_id").eq("role", "student");
  const count: Record<number, number> = {};
  (studs || []).forEach((s) => { if (s.class_id) count[s.class_id] = (count[s.class_id] || 0) + 1; });
  return NextResponse.json((classes || []).map((c) => ({ ...c, students: count[c.id] || 0 })));
}

export async function POST(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim();
  if (name.length < 1) return NextResponse.json({ error: "اسم الصف مطلوب" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("classes")
    .insert({ name, grade_level: b.grade_level || null }).select("id").single();
  if (error || !data) return NextResponse.json({ error: "تعذر إنشاء الصف" }, { status: 500 });
  await admin.from("class_teachers").insert({ class_id: data.id, teacher_id: g.me.id });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
