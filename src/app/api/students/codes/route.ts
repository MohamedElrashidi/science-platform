import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";

// بطاقات الدخول المحفوظة لطلاب صف (أو طالب). RLS تحدد الطلاب المتاحين للمعلم؛ الأكواد تُقرأ بمفتاح الخادم.
export async function GET(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const url = new URL(req.url);
  const classId = url.searchParams.get("class_id");
  const studentId = url.searchParams.get("student_id");

  const supabase = await createClient();
  let q = supabase.from("profiles").select("id, full_name, username").eq("role", "student").eq("active", true).order("full_name");
  if (classId) q = q.eq("class_id", Number(classId));
  if (studentId) q = q.eq("id", studentId);
  const { data: studs } = await q;
  const list = studs || [];
  if (!list.length) return NextResponse.json({ cards: [], missing: [] });

  const { data: codes } = await createAdminClient()
    .from("student_codes").select("student_id, code").in("student_id", list.map((x) => x.id));
  const byId = new Map((codes || []).map((c) => [c.student_id, c.code]));
  const cards = list.filter((x) => byId.has(x.id))
    .map((x) => ({ id: x.id, full_name: x.full_name, username: x.username, access_code: byId.get(x.id) as string }));
  const missing = list.filter((x) => !byId.has(x.id)).map((x) => ({ id: x.id, full_name: x.full_name }));
  return NextResponse.json({ cards, missing });
}
