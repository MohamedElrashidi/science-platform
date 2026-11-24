import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";

export async function GET() {
  const g = await requireRole("admin");
  if ("err" in g) return g.err;
  const { data } = await createAdminClient().from("profiles")
    .select("id, full_name, username, role, active").in("role", ["teacher", "admin"]).order("full_name");
  return NextResponse.json(data || []);
}

// إنشاء معلم: بريد + كلمة مرور (يحددها المدير ويسلّمها للمعلم)
export async function POST(req: Request) {
  const g = await requireRole("admin");
  if ("err" in g) return g.err;
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  const full_name = String(b.full_name || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || full_name.length < 2) {
    return NextResponse.json({ error: "بريد صحيح وكلمة مرور 8 أحرف على الأقل واسم مطلوب" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return NextResponse.json({ error: "البريد مستخدم أو تعذر الإنشاء" }, { status: 409 });
  const username = email.split("@")[0].replace(/[^a-z0-9._-]/g, "").slice(0, 24) + "-" + data.user.id.slice(0, 4);
  const { error: pErr } = await admin.from("profiles").insert({
    id: data.user.id, role: "teacher", full_name, username, created_by: g.me.id,
  });
  if (pErr) { await admin.auth.admin.deleteUser(data.user.id); return NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 }); }
  return NextResponse.json({ id: data.user.id }, { status: 201 });
}
