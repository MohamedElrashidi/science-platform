import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { studentEmail, USERNAME_RE } from "@/lib/auth";
import { verifyChildCode } from "@/lib/parent";

// تسجيل ولي أمر بنفسه: لا يُنشأ الحساب إلا بكود الابن الصحيح.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const full_name = String(b.full_name || "").trim();
  const username = String(b.username || "").trim().toLowerCase();
  const password = String(b.password || "");
  const sid = String(b.student_id || "");
  const phone = String(b.phone || "").trim();
  const pd = phone.replace(/\D/g, "");
  if (!/^\+?[\d\s-]{8,20}$/.test(phone) || pd.length < 8 || pd.length > 15) return NextResponse.json({ error: "اكتب رقم تواصل صحيحًا" }, { status: 400 });
  if (!sid) return NextResponse.json({ error: "اختر الصف ثم اسم ابنك" }, { status: 400 });
  if (full_name.length < 2) return NextResponse.json({ error: "اكتب اسمك" }, { status: 400 });
  if (!USERNAME_RE.test(username)) return NextResponse.json({ error: "اسم المستخدم: 3-30 حرفًا إنجليزيًا صغيرًا أو أرقامًا أو . _ -" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "كلمة المرور 8 أحرف على الأقل" }, { status: 400 });
  const bad = await verifyChildCode(sid, String(b.code || ""));
  if (bad) return NextResponse.json({ error: bad }, { status: 403 });

  const admin = createAdminClient();
  const r = await admin.auth.admin.createUser({ email: studentEmail(username), password, email_confirm: true });
  if (!r.data?.user) return NextResponse.json({ error: "اسم المستخدم مستخدم، اختر غيره" }, { status: 409 });
  const uid = r.data.user.id;
  const { error: pErr } = await admin.from("profiles").insert({ id: uid, role: "parent", full_name, username, phone });
  if (pErr) { await admin.auth.admin.deleteUser(uid); return NextResponse.json({ error: "تعذر حفظ الحساب" }, { status: 500 }); }
  const { error: lErr } = await admin.from("parent_students").insert({ parent_id: uid, student_id: sid });
  if (lErr) { await admin.auth.admin.deleteUser(uid); return NextResponse.json({ error: "تعذر ربط الابن" }, { status: 500 }); }
  return NextResponse.json({ ok: true }, { status: 201 });
}
