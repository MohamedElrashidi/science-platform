import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { studentEmail, USERNAME_RE } from "@/lib/auth";

// دخول الطالب: اسم المستخدم + كود الدخول. مع حد للمحاولات الفاشلة (8 خلال 10 دقائق).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim().toLowerCase();
  const code = String(body.code || "").trim();
  if (!USERNAME_RE.test(username) || code.length < 6) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("login_log").select("id", { count: "exact", head: true })
    .eq("username", username).eq("ok", false).gte("at", since);
  if ((count ?? 0) >= 8) {
    return NextResponse.json({ error: "محاولات كثيرة. حاول بعد 10 دقائق" }, { status: 429 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: studentEmail(username),
    password: code,
  });

  let ok = !error && !!data.user;
  if (ok) {
    const { data: prof } = await admin.from("profiles").select("role, active").eq("id", data.user!.id).single();
    if (!prof || prof.role !== "student" || !prof.active) {
      await supabase.auth.signOut();
      ok = false;
    }
  }
  await admin.from("login_log").insert({ username, ip, ok });
  if (!ok) return NextResponse.json({ error: "اسم المستخدم أو الكود غير صحيح" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
