import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";

// متابعة مباشرة: كل طالب مسند له الامتحان وحالته وتقدمه
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const id = Number((await params).id);
  const sb = await createClient();   // RLS
  const { data: exam } = await sb.from("exams").select("*").eq("id", id).maybeSingle();
  if (!exam) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const { data: asg } = await sb.from("exam_assignments").select("class_id, student_id").eq("exam_id", id);
  const cids = (asg || []).map((a: any) => a.class_id).filter(Boolean), direct = (asg || []).map((a: any) => a.student_id).filter(Boolean);
  const { data: byClass } = cids.length ? await sb.from("profiles").select("id, full_name, class_id").eq("role", "student").eq("active", true).in("class_id", cids) : { data: [] as any[] };
  const { data: byId } = direct.length ? await sb.from("profiles").select("id, full_name, class_id").eq("role", "student").in("id", direct) : { data: [] as any[] };
  const roster = new Map<string, any>();
  [...(byClass || []), ...(byId || [])].forEach((s: any) => roster.set(s.id, s));
  const { data: cls } = await sb.from("classes").select("id, name");
  const cm = new Map((cls || []).map((c: any) => [c.id, c.name]));

  const { data: atts } = await sb.from("attempts").select("*").eq("exam_id", id).order("attempt_no", { ascending: false });
  const latest = new Map<string, any>();
  (atts || []).forEach((a: any) => { if (!latest.has(a.student_id)) latest.set(a.student_id, a); });
  const inProg = (atts || []).filter((a: any) => a.status === "in_progress").map((a: any) => a.id);
  const answered = new Map<number, number>();
  if (inProg.length) {
    const { data: rows } = await sb.from("attempt_answers").select("attempt_id, answer").in("attempt_id", inProg);
    (rows || []).forEach((r: any) => { const a = r.answer; const empty = a === null || a === "" || (Array.isArray(a) && !a.length) || (typeof a === "object" && !Array.isArray(a) && !Object.keys(a).length); if (!empty) answered.set(r.attempt_id, (answered.get(r.attempt_id) || 0) + 1); });
  }
  const { count: nq } = await sb.from("exam_questions").select("question_id", { count: "exact", head: true }).eq("exam_id", id);
  const { data: ovs } = await createAdminClient().from("exam_overrides").select("student_id, extra_attempts, lock").eq("exam_id", id);
  const om = new Map((ovs || []).map((o: any) => [o.student_id, o]));

  const rows = Array.from(roster.values()).map((s: any) => {
    const a = latest.get(s.id), o: any = om.get(s.id);
    return {
      student_id: s.id, name: s.full_name, class: cm.get(s.class_id) ?? "—",
      state: !a ? "none" : a.status === "in_progress" ? "running" : "done",
      attempt_id: a?.id ?? null, attempt_no: a?.attempt_no ?? 0, status: a?.status ?? null,
      answered: a ? (a.status === "in_progress" ? answered.get(a.id) || 0 : null) : 0,
      current: a?.current_q ?? null, percent: a && a.status !== "in_progress" ? a.percent : null, released: !!a?.released_at,
      lock: o?.lock ?? "none", extra: o?.extra_attempts ?? 0, attempts_used: (atts || []).filter((x: any) => x.student_id === s.id).length,
    };
  }).sort((x, y) => x.name.localeCompare(y.name, "ar"));
  return NextResponse.json({ exam: { id: exam.id, title: exam.title, max_attempts: exam.max_attempts, release_mode: exam.release_mode ?? "auto", status: exam.status }, total_questions: nq ?? 0, rows });
}
