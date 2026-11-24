import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Ranked = { id: string; name: string; cls: string; n: number; avg: number };

// ترتيب الطلاب حسب متوسط نتائجهم المصححة (صف واحد أو كل الصفوف)
export async function rankStudents(classId: number | null, minExams = 1): Promise<Ranked[]> {
  const sb = await createClient();
  const [cls, studs, atts] = await Promise.all([
    sb.from("classes").select("id, name"),
    sb.from("profiles").select("id, full_name, class_id").eq("role", "student").eq("active", true).limit(2000),
    sb.from("attempts").select("student_id, percent").eq("status", "graded").limit(5000),
  ]);
  const cn = new Map<number, string>((cls.data || []).map((c: any) => [c.id, c.name]));
  const by = new Map<string, number[]>();
  (atts.data || []).forEach((a: any) => { const l = by.get(a.student_id) || []; l.push(Number(a.percent)); by.set(a.student_id, l); });
  const out: Ranked[] = [];
  for (const s of (studs.data || []) as any[]) {
    if (classId && s.class_id !== classId) continue;
    const xs = by.get(s.id) || [];
    if (xs.length < minExams) continue;
    out.push({ id: s.id, name: s.full_name, cls: cn.get(s.class_id) ?? "—", n: xs.length, avg: xs.reduce((a, b) => a + b, 0) / xs.length });
  }
  return out.sort((a, b) => b.avg - a.avg || b.n - a.n);
}
