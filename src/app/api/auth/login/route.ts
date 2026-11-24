import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// دخول المعلم/المدير بالبريد وكلمة المرور (على الخادم، فتُضبط ملفات تعريف الارتباط مباشرة)
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  if (!email || !password) return NextResponse.json({ error: "أدخل البريد وكلمة المرور" }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: "البريد أو كلمة المرور غير صحيحة" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
