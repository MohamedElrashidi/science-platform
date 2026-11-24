import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentProfile } from "@/lib/auth";
import { MIME } from "@/lib/mime";

// يقدّم الملف بعد التحقق (RLS): المعلم صاحبه أو الطالب المسند إليه. الصفحات الـ HTML تعمل في صندوق معزول.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentProfile();
  if (!me) return new Response("يجب تسجيل الدخول", { status: 401 });
  const id = Number((await params).id);
  const { data: r } = await (await createClient()).from("resources").select("storage_path, filename").eq("id", id).maybeSingle();
  if (!r?.storage_path) return new Response("غير موجود", { status: 404 });
  if (new URL(req.url).searchParams.get("mode") === "url") {
    const { data: u } = await createAdminClient().storage.from("content").createSignedUrl(r.storage_path, 7200);
    return Response.json({ url: u?.signedUrl ?? null });
  }
  const { data, error } = await createAdminClient().storage.from("content").download(r.storage_path);
  if (error || !data) return new Response("تعذر فتح الملف", { status: 500 });
  const ext = r.storage_path.split(".").pop()!.toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const inline = ["pdf", "html", "htm", "png", "jpg", "jpeg", "webp", "gif", "mp4", "mp3"].includes(ext);
  const h = new Headers({ "Content-Type": type + (ext.startsWith("htm") ? "; charset=utf-8" : ""), "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=300",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(r.filename || "file." + ext)}` });
  if (ext.startsWith("htm")) h.set("Content-Security-Policy", "sandbox allow-scripts allow-forms; default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval' https:;");
  return new Response(data, { headers: h });
}
