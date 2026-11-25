import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";

export async function GET() {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const supabase = await createClient();   // RLS: امتحانات المعلم فقط (والمدير الكل)
  const { data: exams } = await supabase.from("exams")
    .select("*")
    .order("created_at", { ascending: false });
  const list = exams || [];
  const ids = list.map((e) => e.id);
  const count: Record<number, { total: number; pending: number }> = {};
  if (ids.length) {
    const { data: eq } = await supabase.from("exam_questions").select("exam_id, questions(status)").in("exam_id", ids);
    (eq || []).forEach((r: any) => {
      const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
      const c = (count[r.exam_id] ||= { total: 0, pending: 0 });
      c.total++; if (q?.status === "pending_review") c.pending++;
    });
  }
  return NextResponse.json(list.map((e) => ({ ...e, total: count[e.id]?.total ?? 0, pending: count[e.id]?.pending ?? 0 })));
}
