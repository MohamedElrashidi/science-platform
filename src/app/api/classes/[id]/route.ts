import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";

async function allowed(id: number) {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id").eq("id", id).maybeSingle();
  return !!data;   // RLS تُخفي صفوف غير المسؤول عنها
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await ctx.params).id);
  if (!(await allowed(id))) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "اسم الصف مطلوب" }, { status: 400 });
  await createAdminClient().from("classes").update({ name, grade_level: b.grade_level || null }).eq("id", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await ctx.params).id);
  if (!(await allowed(id))) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  await createAdminClient().from("classes").delete().eq("id", id);   // الطلاب يبقون بلا صف
  return NextResponse.json({ ok: true });
}
