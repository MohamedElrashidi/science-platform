import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await params).id), b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof b.prompt === "string" && b.prompt.trim()) patch.prompt = b.prompt.trim().slice(0, 4000);
  if (b.marks !== undefined) { const m = Number(b.marks); if (!(m > 0 && m <= 100)) return NextResponse.json({ error: "الدرجة غير صحيحة" }, { status: 400 }); patch.marks = m; }
  if (["approved", "pending_review"].includes(b.status)) patch.status = b.status;
  if (typeof b.explanation === "string") patch.explanation = b.explanation.slice(0, 2000) || null;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "لا تغيير" }, { status: 400 });
  const { error } = await (await createClient()).from("questions").update(patch).eq("id", id);
  return error ? NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await params).id);
  const sb = await createClient();
  const { count } = await sb.from("attempt_answers").select("question_id", { count: "exact", head: true }).eq("question_id", id);
  if (count) return NextResponse.json({ error: "السؤال مستخدم في محاولات طلاب، لا يمكن حذفه" }, { status: 409 });
  const { error } = await sb.from("questions").delete().eq("id", id);
  return error ? NextResponse.json({ error: "تعذر الحذف" }, { status: 500 }) : NextResponse.json({ ok: true });
}
