import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";

// نتيجة نشاط تفاعلي يرسلها الطالب من الصفحة (postMessage → هنا).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("student");
  if ("err" in g) return g.err;
  const id = Number((await params).id), b = await req.json().catch(() => ({}));
  const score = Number(b.score), max = Number(b.max);
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0 || max > 10000 || score < 0 || score > max) return NextResponse.json({ error: "نتيجة غير صحيحة" }, { status: 400 });
  const sb = await createClient();
  const { data: r } = await sb.from("resources").select("*").eq("id", id).maybeSingle();   // يراه فقط إن كان مسندًا ومنشورًا
  if (!r) return NextResponse.json({ error: "غير متاح" }, { status: 404 });
  const { count } = await sb.from("resource_results").select("id", { count: "exact", head: true }).eq("resource_id", id).eq("student_id", g.me.id);
  if ((count ?? 0) >= Number((r as any).max_attempts ?? 1)) return NextResponse.json({ error: "استنفدت محاولاتك. اطلب من معلمك فتح محاولة جديدة" }, { status: 409 });
  const { error } = await sb.from("resource_results").insert({ resource_id: id, student_id: g.me.id, score, max_score: max });
  return error ? NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 }) : NextResponse.json({ ok: true });
}
