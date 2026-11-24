import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { createAdminClient } from "@/lib/supabase/admin";

const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

// رفع صورة سؤال إلى حاوية media الخاصة. المسار تحت مجلد المستخدم نفسه فقط.
export async function POST(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file"), path = String(fd?.get("path") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "لا يوجد ملف" }, { status: 400 });
  if (!/^[A-Za-z0-9._\-\/]{1,150}$/.test(path) || path.includes("..") || path.startsWith("/"))
    return NextResponse.json({ error: "اسم الصورة غير صالح (حروف إنجليزية وأرقام فقط)" }, { status: 400 });
  if (!OK_TYPES.includes(file.type)) return NextResponse.json({ error: "نوع الصورة غير مدعوم" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "الصورة أكبر من 4 ميغابايت" }, { status: 400 });

  const key = `${g.me.id}/${path}`;
  const { error } = await createAdminClient().storage.from("media")
    .upload(key, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
  if (error) return NextResponse.json({ error: "تعذر رفع الصورة" }, { status: 500 });
  return NextResponse.json({ url: `storage:media/${key}` });
}
