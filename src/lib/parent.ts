import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export async function parentChildren(parentId: string) {
  const d = createAdminClient();
  const { data: links } = await d.from("parent_students").select("student_id").eq("parent_id", parentId);
  const ids = (links || []).map((l: any) => l.student_id);
  if (!ids.length) return [];
  const { data } = await d.from("profiles").select("id, full_name, class_id").in("id", ids).eq("role", "student").eq("active", true).order("full_name");
  return (data || []) as { id: string; full_name: string; class_id: number | null }[];
}

export type ChildReport = Awaited<ReturnType<typeof childReport>>;

/** تقرير الابن. يُستدعى فقط بعد التحقق من أن الابن مرتبط بولي الأمر. */
export async function childReport(child: { id: string; full_name: string; class_id: number | null }) {
  const d = createAdminClient();
  const [cls, mine, mates] = await Promise.all([
    child.class_id ? d.from("classes").select("name").eq("id", child.class_id).maybeSingle() : Promise.resolve({ data: null }),
    d.from("attempts").select("id, exam_id, percent, status, submitted_at, exams(title)").eq("student_id", child.id).in("status", ["graded", "submitted"]).order("submitted_at", { ascending: true }).limit(500),
    child.class_id ? d.from("profiles").select("id").eq("role", "student").eq("active", true).eq("class_id", child.class_id).limit(500) : Promise.resolve({ data: [] as any[] }),
  ]);
  const all: any[] = mine.data || [];
  const graded = all.filter((a) => a.status === "graded");
  const pending = all.length - graded.length;
  const my = graded.map((a) => Number(a.percent));
  const myAvg = avg(my);

  // الترتيب في الصف (بلا كشف أسماء الآخرين)
  let rank: number | null = null, of = 0, classAvg: number | null = null;
  const mateIds: string[] = ((mates as any).data || []).map((m: any) => m.id);
  if (mateIds.length && myAvg !== null) {
    const { data: ca } = await d.from("attempts").select("student_id, percent").eq("status", "graded").in("student_id", mateIds).limit(8000);
    const by = new Map<string, number[]>();
    (ca || []).forEach((a: any) => { const l = by.get(a.student_id) || []; l.push(Number(a.percent)); by.set(a.student_id, l); });
    const avgs = Array.from(by.values()).map((x) => avg(x)!);
    of = avgs.length; classAvg = avg(avgs);
    rank = 1 + avgs.filter((x) => x > myAvg + 1e-9).length;
  }

  // نقاط القوة والضعف حسب الدروس
  const { data: ans } = await d.from("attempt_answers")
    .select("marks_awarded, max_marks, attempts!inner(student_id, status), questions(lessons(title))")
    .eq("attempts.student_id", child.id).eq("attempts.status", "graded").limit(5000);
  const lm = new Map<string, { s: number; m: number }>();
  (ans || []).forEach((r: any) => {
    const t = r.questions?.lessons?.title; if (!t || r.marks_awarded === null) return;
    const o = lm.get(t) || { s: 0, m: 0 }; o.s += Number(r.marks_awarded); o.m += Number(r.max_marks); lm.set(t, o);
  });
  const lessons = Array.from(lm.entries()).filter(([, v]) => v.m > 0).map(([title, v]) => ({ title, avg: (100 * v.s) / v.m, n: Math.round(v.m) })).sort((a, b) => b.avg - a.avg);

  const exams = graded.map((a) => ({ id: a.id as number, title: (a.exams?.title as string) || "امتحان", percent: Number(a.percent), at: a.submitted_at as string | null }));
  return { className: (cls.data as any)?.name ?? null, exams, pending, myAvg, rank, of, classAvg, lessons };
}

/** يتحقق من كود الابن (مع حد للمحاولات الفاشلة). يعيد خطأ نصيًا أو null عند النجاح. */
export async function verifyChildCode(studentId: string, codeRaw: string): Promise<string | null> {
  const d = createAdminClient();
  const code = codeRaw.trim().toUpperCase();
  const { data: st } = await d.from("profiles").select("id, username").eq("id", studentId).eq("role", "student").eq("active", true).maybeSingle();
  if (!st || code.length < 6) return "بيانات غير صحيحة";
  const key = "reg:" + st.username;
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await d.from("login_log").select("id", { count: "exact", head: true }).eq("username", key).eq("ok", false).gte("at", since);
  if ((count ?? 0) >= 8) return "محاولات كثيرة. حاول بعد 10 دقائق";
  const { data: c } = await d.from("student_codes").select("code").eq("student_id", studentId).maybeSingle();
  if (!c) return "تعذر التحقق من الكود. اطلب من المعلم توليد كود جديد للطالب";
  const ok = c.code.toUpperCase() === code;
  await d.from("login_log").insert({ username: key, ip: "", ok });
  return ok ? null : "كود الطالب غير صحيح";
}
