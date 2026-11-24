import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { EXT } from "@/lib/mime";

const MAX = 50 * 1024 * 1024;   // حد الخطة المجانية في Supabase

// رابط رفع مباشر من المتصفح إلى التخزين (يتجاوز حد 4.5MB في Vercel).
export async function POST(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const b = await req.json().catch(() => ({}));
  const ext = String(b.filename || "").split(".").pop()?.toLowerCase() || "";
  if (!EXT[ext]) return NextResponse.json({ error: "نوع الملف غير مدعوم" }, { status: 400 });
  if (!(Number(b.size) > 0) || Number(b.size) > MAX) return NextResponse.json({ error: "الحد الأقصى للملف 50 ميغابايت. للأكبر استخدم رابط YouTube أو Drive." }, { status: 400 });
  const path = `${g.me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await createAdminClient().storage.from("content").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "تعذر تجهيز الرفع" }, { status: 500 });
  return NextResponse.json({ path, token: data.token });
}
