import { NextResponse } from "next/server";
import { makeCode, saveCode } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";

// تعديل ولي الأمر: add/remove (معرّفات أبناء) أو reset (كود دخول جديد)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = (await ctx.params).id;
  const b = await req.json().catch(() => ({}));
  const d = createAdminClient();
  const sb = await createClient();
  const { data: p } = await d.from("profiles").select("id, username, created_by").eq("id", id).eq("role", "parent").maybeSingle();
  if (!p) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (g.me.role !== "admin" && p.created_by !== g.me.id) {
    const { data: ls } = await d.from("parent_students").select("student_id").eq("parent_id", id);
    const { data: vis } = await sb.from("profiles").select("id").eq("role", "student").in("id", (ls || []).map((l: any) => l.student_id));
    if (!vis?.length) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const add: string[] = Array.isArray(b.add) ? b.add.map(String) : [];
  const remove: string[] = Array.isArray(b.remove) ? b.remove.map(String) : [];
  if (add.length) {
    const { data: ok } = await sb.from("profiles").select("id").eq("role", "student").in("id", add);
    if ((ok || []).length !== add.length) return NextResponse.json({ error: "بعض الطلاب غير متاحين لك" }, { status: 403 });
    await d.from("parent_students").upsert(add.map((s) => ({ parent_id: id, student_id: s })));
  }
  if (typeof b.phone === "string") await d.from("profiles").update({ phone: b.phone.trim() || null }).eq("id", id);
  if (remove.length) await d.from("parent_students").delete().eq("parent_id", id).in("student_id", remove);
  if (b.reset) {
    const code = makeCode();
    const { error } = await d.auth.admin.updateUserById(id, { password: code });
    if (error) return NextResponse.json({ error: "تعذر تغيير الكود" }, { status: 500 });
    await saveCode(id, code);
    return NextResponse.json({ username: p.username, access_code: code });
  }
  return NextResponse.json({ ok: true });
}
