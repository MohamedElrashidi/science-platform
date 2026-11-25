import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";
import { finalize } from "@/lib/attempts";

// تحكم المعلم: lock_temp | unlock | lock_final | retake | reopen
// الهدف: student_ids أو all:true (كل المسندين).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await params).id);
  const b = await req.json().catch(() => ({}));
  const sb = await createClient();
  const { data: exam } = await sb.from("exams").select("id, duration_minutes").eq("id", id).maybeSingle();   // ملكية المعلم عبر RLS
  if (!exam) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const d = createAdminClient();

  let ids: string[] = Array.isArray(b.student_ids) ? b.student_ids.map(String) : [];
  if (b.all === true) {
    const { data: asg } = await sb.from("exam_assignments").select("class_id, student_id").eq("exam_id", id);
    const cids = (asg || []).map((a: any) => a.class_id).filter(Boolean), direct = (asg || []).map((a: any) => a.student_id).filter(Boolean);
    const { data: bc } = cids.length ? await sb.from("profiles").select("id").eq("role", "student").eq("active", true).in("class_id", cids) : { data: [] as any[] };
    ids = Array.from(new Set([...(bc || []).map((s: any) => s.id), ...direct]));
  }
  if (!ids.length) return NextResponse.json({ error: "اختر طالبًا أو الكل" }, { status: 400 });
  const { data: ok } = await sb.from("profiles").select("id").eq("role", "student").in("id", ids);   // طلابه فقط
  ids = (ok || []).map((s: any) => s.id);
  if (!ids.length) return NextResponse.json({ error: "الطلاب غير متاحين لك" }, { status: 403 });

  const { data: cur } = await d.from("exam_overrides").select("student_id, extra_attempts, lock").eq("exam_id", id).in("student_id", ids);
  const cm = new Map((cur || []).map((c: any) => [c.student_id, c]));
  const upsert = (f: (c: any) => object) => d.from("exam_overrides").upsert(ids.map((s) => ({ exam_id: id, student_id: s, extra_attempts: cm.get(s)?.extra_attempts ?? 0, lock: cm.get(s)?.lock ?? "none", ...f(cm.get(s) || {}) })));

  const act = String(b.action);
  if (act === "lock_temp") { const { error } = await upsert(() => ({ lock: "temp" })); if (error) return fail(); }
  else if (act === "unlock") { const { error } = await upsert(() => ({ lock: "none" })); if (error) return fail(); }
  else if (act === "lock_final") {
    const { error } = await upsert(() => ({ lock: "final" })); if (error) return fail();
    const { data: run } = await d.from("attempts").select("id").eq("exam_id", id).eq("status", "in_progress").in("student_id", ids);
    for (const r of run || []) await finalize(r.id);   // إنهاء قهري وتصحيح ما أُجيب
  }
  else if (act === "retake") { const { error } = await upsert((c) => ({ extra_attempts: Number(c.extra_attempts || 0) + 1, lock: "none" })); if (error) return fail(); }
  else if (act === "reopen") {
    // استكمال: إعادة فتح آخر محاولة منتهية لتكملها من حيث توقفت
    const mins = Math.min(600, Math.max(1, Number(b.minutes) || exam.duration_minutes || 15));
    const { data: last } = await d.from("attempts").select("id, student_id, attempt_no, status").eq("exam_id", id).in("student_id", ids).neq("status", "in_progress").order("attempt_no", { ascending: false });
    const seen = new Set<string>();
    for (const a of last || []) {
      if (seen.has(a.student_id)) continue; seen.add(a.student_id);
      const { data: running } = await d.from("attempts").select("id").eq("exam_id", id).eq("student_id", a.student_id).eq("status", "in_progress").maybeSingle();
      if (running) continue;
      await d.from("attempts").update({ status: "in_progress", submitted_at: null, released_at: null, deadline_at: new Date(Date.now() + mins * 60000).toISOString() }).eq("id", a.id);
    }
    const { error } = await upsert(() => ({ lock: "none" })); if (error) return fail();
  }
  else return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  return NextResponse.json({ ok: true, count: ids.length });

  function fail() { return NextResponse.json({ error: "تعذر الحفظ. هل شغّلت ملف 0007 في Supabase؟" }, { status: 500 }); }
}
