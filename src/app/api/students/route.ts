import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentProfile, studentEmail, USERNAME_RE } from "@/lib/auth";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بلا حروف متشابهة (0/O, 1/I)
const makeCode = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export async function GET() {
  const me = await currentProfile();
  if (!me || me.role === "student") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const supabase = await createClient();   // RLS تحدد الطلاب المتاحين
  const { data } = await supabase.from("profiles")
    .select("id, full_name, username, class_id, active, grade_level").eq("role", "student").order("full_name");
  return NextResponse.json(data || []);
}

// إنشاء حساب طالب بواسطة المعلم/المدير. يُعاد كود الدخول مرة واحدة فقط ولا يُخزَّن نصاً.
export async function POST(req: Request) {
  const me = await currentProfile();
  if (!me || (me.role !== "teacher" && me.role !== "admin")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const b = await req.json().catch(() => ({}));
  const full_name = String(b.full_name || "").trim();
  const given = String(b.username || "").trim().toLowerCase();
  const class_id = b.class_id ? Number(b.class_id) : null;
  if (full_name.length < 2) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  if (given && !USERNAME_RE.test(given)) {
    return NextResponse.json({ error: "اسم المستخدم: 3-30 حرفاً إنجليزياً صغيراً أو أرقاماً أو . _ -" }, { status: 400 });
  }

  if (class_id) {
    // RLS تُرجع الصف فقط إن كان المعلم مسؤولاً عن هذا الصف
    const supabase = await createClient();
    const { data: cls } = await supabase.from("classes").select("id, grade_level").eq("id", class_id).maybeSingle();
    if (!cls) return NextResponse.json({ error: "الصف غير متاح لك" }, { status: 403 });
  }

  const admin = createAdminClient();
  const code = makeCode();
  let username = given;
  let userId = "";
  let lastErr = "";
  for (let i = 0; i < 6; i++) {
    if (!given) username = "s" + String(randomInt(10000, 100000));   // توليد تلقائي
    const r = await admin.auth.admin.createUser({ email: studentEmail(username), password: code, email_confirm: true });
    if (r.data && r.data.user) { userId = r.data.user.id; break; }
    lastErr = (r.error && r.error.message) || "";
    if (given || !/already|registered|exists/i.test(lastErr)) break;   // اسم محدد: لا إعادة محاولة
  }
  if (!userId) {
    const dup = /already|registered|exists/i.test(lastErr);
    return NextResponse.json({ error: dup ? "اسم المستخدم مستخدم" : "تعذر إنشاء الحساب" }, { status: dup ? 409 : 500 });
  }
  const { error: pErr } = await admin.from("profiles").insert({
    id: userId, role: "student", full_name, username, class_id,
    phone: b.phone || null, guardian_name: b.guardian_name || null,
    grade_level: b.grade_level || null, created_by: me.id,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "تعذر حفظ بيانات الطالب" }, { status: 500 });
  }
  return NextResponse.json({ id: userId, username, access_code: code }, { status: 201 });
}
