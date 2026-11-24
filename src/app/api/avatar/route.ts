import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentProfile } from "@/lib/auth";

const MAX = 400 * 1024;   // الصورة تُصغَّر في المتصفح إلى ~256px، فهذا حد أمان

export async function POST(req: Request) {
  const me = await currentProfile();
  if (!me) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length || buf.length > MAX) return NextResponse.json({ error: "الصورة كبيرة أو فارغة" }, { status: 413 });
  if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) return NextResponse.json({ error: "الصورة يجب أن تكون JPEG" }, { status: 400 });
  const { error } = await createAdminClient().storage.from("media").upload(`avatars/${me.id}.jpg`, buf, { contentType: "image/jpeg", upsert: true });
  if (error) return NextResponse.json({ error: "تعذر رفع الصورة" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const me = await currentProfile();
  if (!me) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  await createAdminClient().storage.from("media").remove([`avatars/${me.id}.jpg`]);
  return NextResponse.json({ ok: true });
}
