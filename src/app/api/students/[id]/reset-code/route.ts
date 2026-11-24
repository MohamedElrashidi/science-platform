import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";
import { makeCode, saveCode } from "@/lib/codes";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = (await ctx.params).id;
  const supabase = await createClient();   // RLS: يرى الطالب فقط إن كان طالبه/في صفه
  const { data: s } = await supabase.from("profiles").select("id, username, full_name").eq("id", id).eq("role", "student").maybeSingle();
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const code = makeCode();
  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password: code });
  if (error) return NextResponse.json({ error: "تعذر تغيير الكود" }, { status: 500 });
  await saveCode(id, code);
  return NextResponse.json({ username: s.username, full_name: s.full_name, access_code: code });
}
