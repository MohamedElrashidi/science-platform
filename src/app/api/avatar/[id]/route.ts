import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentProfile } from "@/lib/auth";

// الصورة تظهر لصاحبها، ولمعلمه (حسب RLS)، ولولي أمره المرتبط به فقط
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentProfile();
  if (!me) return new Response("غير مصرح", { status: 401 });
  const id = (await ctx.params).id;
  let ok = me.id === id;
  if (!ok && (me.role === "admin" || me.role === "teacher")) {
    const { data } = await (await createClient()).from("profiles").select("id").eq("id", id).maybeSingle();
    ok = !!data;
  }
  if (!ok && me.role === "parent") {
    const { data } = await createAdminClient().from("parent_students").select("student_id").eq("parent_id", me.id).eq("student_id", id).maybeSingle();
    ok = !!data;
  }
  if (!ok) return new Response("غير مصرح", { status: 403 });
  const { data, error } = await createAdminClient().storage.from("media").download(`avatars/${id}.jpg`);
  if (error || !data) return new Response("لا توجد صورة", { status: 404 });
  return new Response(data, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff" } });
}
