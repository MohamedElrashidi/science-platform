import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";
import { EXT } from "@/lib/mime";

const MAX = 4 * 1024 * 1024;   // حد جسم الطلب في Vercel ≈ 4.5MB

export async function GET(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const kind = new URL(req.url).searchParams.get("kind");
  const sb = await createClient();
  let q = sb.from("resources").select("id, title, kind, source, filename, external_url, size, status, grade_level, created_at, subjects(name)").order("id", { ascending: false });
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  const ids = (data || []).map((r) => r.id);
  const { data: as } = ids.length ? await sb.from("resource_assignments").select("id, resource_id, class_id, classes(name)").in("resource_id", ids) : { data: [] as any[] };
  return NextResponse.json((data || []).map((r) => ({ ...r, assignments: (as || []).filter((a: any) => a.resource_id === r.id).map((a: any) => ({ id: a.id, name: a.classes?.name })) })));
}

export async function POST(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 400 });
  const title = String(fd.get("title") || "").trim().slice(0, 200);
  const kind = ["worksheet", "activity", "video"].includes(String(fd.get("kind"))) ? String(fd.get("kind")) : "worksheet";
  const link = String(fd.get("link") || "").trim();
  const file = fd.get("file");
  if (!title) return NextResponse.json({ error: "أدخل عنوانًا" }, { status: 400 });
  const sb = await createClient();
  const base: any = { owner_id: g.me.id, title, kind, grade_level: String(fd.get("grade_level") || "").trim() || null, description: String(fd.get("description") || "").slice(0, 1000) || null, status: "draft" };

  const pre = String(fd.get("storage_path") || "");
  if (pre) {   // رُفع مباشرةً إلى التخزين عبر رابط موقّع
    const ext = (pre.split(".").pop() || "").toLowerCase();
    if (!pre.startsWith(`${g.me.id}/`) || pre.includes("..") || !EXT[ext]) return NextResponse.json({ error: "مسار الملف غير صالح" }, { status: 400 });
    Object.assign(base, { source: "file", storage_path: pre, filename: String(fd.get("filename") || "video").slice(0, 200), size: Number(fd.get("size")) || 0 });
  } else if (file instanceof File && file.size) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!EXT[ext]) return NextResponse.json({ error: "نوع الملف غير مدعوم (PDF, HTML, صور, Word, PowerPoint, Excel, فيديو, صوت)" }, { status: 400 });
    if (file.size > MAX) return NextResponse.json({ error: "الملف أكبر من 4 ميغابايت. ارفعه على Google Drive أو YouTube وضع الرابط بدل الملف." }, { status: 400 });
    const path = `${g.me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await createAdminClient().storage.from("content").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: EXT[ext], upsert: false });
    if (up.error) return NextResponse.json({ error: "تعذر رفع الملف" }, { status: 500 });
    Object.assign(base, { source: ext === "html" || ext === "htm" ? "html" : "file", storage_path: path, filename: file.name.slice(0, 200), size: file.size });
  } else if (/^https:\/\//i.test(link)) {
    Object.assign(base, { source: "link", external_url: link.slice(0, 1000) });
  } else return NextResponse.json({ error: "ارفع ملفًا أو ضع رابطًا يبدأ بـ https" }, { status: 400 });

  const { data, error } = await sb.from("resources").insert(base).select("id").single();
  if (error) return NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
