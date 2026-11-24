import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { makeCode, saveCode } from "@/lib/codes";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";
import { studentEmail } from "@/lib/auth";

// أولياء الأمور الذين يديرهم المستخدم: من أنشأهم، أو المرتبطون بطلاب يراهم (RLS)
export async function GET() {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const d = createAdminClient();
  const sb = await createClient();
  const { data: vis } = await sb.from("profiles").select("id, full_name").eq("role", "student").limit(2000);
  const names = new Map<string, string>((vis || []).map((s: any) => [s.id, s.full_name]));
  const { data: links } = await d.from("parent_students").select("parent_id, student_id").limit(5000);
  const mine = new Set<string>();
  (links || []).forEach((l: any) => { if (g.me.role === "admin" || names.has(l.student_id)) mine.add(l.parent_id); });
  const { data: ps } = await d.from("profiles").select("id, full_name, username, active, created_by").eq("role", "parent").order("full_name").limit(1000);
  const out = (ps || []).filter((p: any) => g.me.role === "admin" || p.created_by === g.me.id || mine.has(p.id)).map((p: any) => ({
    id: p.id, full_name: p.full_name, username: p.username, active: p.active,
    children: (links || []).filter((l: any) => l.parent_id === p.id).map((l: any) => ({ id: l.student_id, full_name: names.get(l.student_id) ?? "طالب آخر" })),
  }));
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const b = await req.json().catch(() => ({}));
  const full_name = String(b.full_name || "").trim();
  const ids: string[] = Array.isArray(b.student_ids) ? (Array.from(new Set(b.student_ids.map(String))) as string[]) : [];
  if (full_name.length < 2 || !ids.length) return NextResponse.json({ error: "اكتب الاسم واختر ابنًا واحدًا على الأقل" }, { status: 400 });
  const sb = await createClient();   // RLS: الطلاب المتاحون لهذا المعلم فقط
  const { data: ok } = await sb.from("profiles").select("id").eq("role", "student").in("id", ids);
  if ((ok || []).length !== ids.length) return NextResponse.json({ error: "بعض الطلاب غير متاحين لك" }, { status: 403 });

  const admin = createAdminClient();
  const code = makeCode();
  let username = "", userId = "";
  for (let i = 0; i < 6 && !userId; i++) {
    username = "p" + String(randomInt(10000, 100000));
    const r = await admin.auth.admin.createUser({ email: studentEmail(username), password: code, email_confirm: true });
    if (r.data?.user) userId = r.data.user.id;
  }
  if (!userId) return NextResponse.json({ error: "تعذر إنشاء الحساب" }, { status: 500 });
  const { error: pErr } = await admin.from("profiles").insert({ id: userId, role: "parent", full_name, username, created_by: g.me.id });
  if (pErr) { await admin.auth.admin.deleteUser(userId); return NextResponse.json({ error: "تعذر حفظ الحساب. هل شغّلت ملف 0006 في Supabase؟" }, { status: 500 }); }
  const { error: lErr } = await admin.from("parent_students").insert(ids.map((s) => ({ parent_id: userId, student_id: s })));
  if (lErr) { await admin.auth.admin.deleteUser(userId); return NextResponse.json({ error: "تعذر ربط الأبناء" }, { status: 500 }); }
  await saveCode(userId, code);
  return NextResponse.json({ id: userId, username, access_code: code }, { status: 201 });
}
