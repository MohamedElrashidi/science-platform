import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";

export async function GET(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const u = new URL(req.url).searchParams;
  const sb = await createClient();
  let q = sb.from("questions").select("id, qtype, prompt, marks, difficulty, status, media_url, subject_id, lesson_id, grade_level, created_at, data, explanation, subjects(name), lessons(title)")
    .order("id", { ascending: false }).limit(500);
  if (u.get("status")) q = q.eq("status", u.get("status")!);
  if (u.get("qtype")) q = q.eq("qtype", u.get("qtype")!);
  if (u.get("subject_id")) q = q.eq("subject_id", Number(u.get("subject_id")));
  if (u.get("lesson_id")) q = q.eq("lesson_id", Number(u.get("lesson_id")));
  const s = (u.get("q") || "").trim().replace(/[%,()]/g, " ");
  if (s) q = q.ilike("prompt", `%${s}%`);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
  return NextResponse.json(data);
}

// اعتماد جماعي: { ids:[...], status:"approved"|"pending_review" }
export async function PATCH(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const b = await req.json().catch(() => ({}));
  const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter(Number.isInteger).slice(0, 500) : [];
  if (!ids.length || !["approved", "pending_review"].includes(b.status)) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 400 });
  const { error } = await (await createClient()).from("questions").update({ status: b.status }).in("id", ids);
  return error ? NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 }) : NextResponse.json({ ok: true });
}
