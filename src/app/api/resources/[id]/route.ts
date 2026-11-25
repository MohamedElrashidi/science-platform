import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await params).id), b = await req.json().catch(() => ({}));
  const sb = await createClient();
  const { data: r } = await sb.from("resources").select("id").eq("id", id).maybeSingle();
  if (!r) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (b.action === "publish" || b.action === "unpublish") await sb.from("resources").update({ status: b.action === "publish" ? "published" : "draft" }).eq("id", id);
  else if (b.action === "set_attempts") {
    const n = Math.min(50, Math.max(1, Math.floor(Number(b.max_attempts) || 1)));
    const { error } = await sb.from("resources").update({ max_attempts: n }).eq("id", id);
    if (error) return NextResponse.json({ error: "تعذر الحفظ. هل شغّلت ملف 0008 في Supabase؟" }, { status: 500 });
  } else if (b.action === "assign") {
    const cid = Number(b.class_id);
    const { data: c } = await sb.from("classes").select("id").eq("id", cid).maybeSingle();   // RLS: صفوفه فقط
    if (!c) return NextResponse.json({ error: "صف غير صالح" }, { status: 400 });
    const { data: ex } = await sb.from("resource_assignments").select("id").eq("resource_id", id).eq("class_id", cid).maybeSingle();
    if (!ex) await sb.from("resource_assignments").insert({ resource_id: id, class_id: cid });
  } else if (b.action === "unassign") await sb.from("resource_assignments").delete().eq("id", Number(b.assignment_id)).eq("resource_id", id);
  else return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await params).id);
  const sb = await createClient();
  const { data: r } = await sb.from("resources").select("storage_path").eq("id", id).maybeSingle();
  if (!r) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const { error } = await sb.from("resources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "تعذر الحذف" }, { status: 500 });
  if (r.storage_path) await createAdminClient().storage.from("content").remove([r.storage_path]);
  return NextResponse.json({ ok: true });
}
