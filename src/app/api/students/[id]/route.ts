import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";

async function visible(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id").eq("id", id).eq("role", "student").maybeSingle();
  return !!data;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = (await ctx.params).id;
  if (!(await visible(id))) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof b.full_name === "string" && b.full_name.trim().length >= 2) patch.full_name = b.full_name.trim();
  if (typeof b.active === "boolean") patch.active = b.active;
  if ("class_id" in b) {
    if (b.class_id) {
      const supabase = await createClient();
      const { data: c } = await supabase.from("classes").select("id").eq("id", Number(b.class_id)).maybeSingle();
      if (!c) return NextResponse.json({ error: "الصف غير متاح لك" }, { status: 403 });
      patch.class_id = Number(b.class_id);
    } else patch.class_id = null;
  }
  await createAdminClient().from("profiles").update(patch).eq("id", id);
  return NextResponse.json({ ok: true });
}
