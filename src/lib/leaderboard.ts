import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isReleased } from "@/lib/release";

export type Comp = { id: string; name: string; solved: number; correct: number; exams: number };

// منافسة: عدد الأسئلة المحلولة وعدد الإجابات الصحيحة لطلاب صف واحد (من محاولات مصححة ومعتمدة فقط)
export async function competition(classId: number): Promise<Comp[]> {
  const d = createAdminClient();
  const { data: studs } = await d.from("profiles").select("id, full_name").eq("role", "student").eq("active", true).eq("class_id", classId);
  const ids = (studs || []).map((s: any) => s.id);
  if (!ids.length) return [];
  const { data: atts } = await d.from("attempts").select("*, exams(*)").in("student_id", ids).eq("status", "graded").limit(5000);
  const ok = (atts || []).filter((a: any) => isReleased(a.exams, a));
  const owner = new Map<number, string>(ok.map((a: any) => [a.id, a.student_id]));
  const stat = new Map<string, Comp>((studs || []).map((s: any) => [s.id, { id: s.id, name: s.full_name, solved: 0, correct: 0, exams: 0 }]));
  ok.forEach((a: any) => { const c = stat.get(a.student_id); if (c) c.exams++; });
  const aids = Array.from(owner.keys());
  for (let i = 0; i < aids.length; i += 200) {
    const { data: rows } = await d.from("attempt_answers").select("attempt_id, answer, marks_awarded, max_marks").in("attempt_id", aids.slice(i, i + 200)).limit(10000);
    (rows || []).forEach((r: any) => {
      const c = stat.get(owner.get(r.attempt_id) || ""); if (!c || r.marks_awarded === null) return;
      c.solved++; if (Number(r.marks_awarded) >= Number(r.max_marks)) c.correct++;
    });
  }
  return Array.from(stat.values()).sort((a, b) => b.correct - a.correct || b.solved - a.solved);
}
