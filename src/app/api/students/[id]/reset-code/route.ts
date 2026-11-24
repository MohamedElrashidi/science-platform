import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = (await ctx.params).id;
  const supabase = await createClient();   // RLS: يرى الطالب فقط إن كان طالبه/في صفه
  const { data: s } = await supabase.from("profiles").select("id, username, full_name").eq("id", id).eq("role", "student").maybeSingle();
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password: code });
  if (error) return NextResponse.json({ error: "تعذر تغيير الكود" }, { status: 500 });
  return NextResponse.json({ username: s.username, full_name: s.full_name, access_code: code });
}
