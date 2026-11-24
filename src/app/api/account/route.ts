import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";

// تعديل اسمي وكلمة مروري (للمعلم والمدير فقط؛ كود الطالب يدار من المعلم).
export async function PATCH(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const b = await req.json().catch(() => ({}));
  if (typeof b.full_name === "string") {
    const n = b.full_name.trim().slice(0, 100);
    if (n.length < 2) return NextResponse.json({ error: "الاسم قصير جدًا" }, { status: 400 });
    const { error } = await createAdminClient().from("profiles").update({ full_name: n }).eq("id", g.me.id);
    if (error) return NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 });
  }
  if (typeof b.password === "string" && b.password) {
    if (b.password.length < 8) return NextResponse.json({ error: "كلمة المرور 8 أحرف على الأقل" }, { status: 400 });
    const { error } = await (await createClient()).auth.updateUser({ password: b.password });
    if (error) return NextResponse.json({ error: "تعذر تغيير كلمة المرور" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
