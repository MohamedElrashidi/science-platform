import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentProfile, isStaff } from "@/lib/auth";
import { Empty, ExamBars } from "@/components/Charts";
import PrintButton from "./PrintButton";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const band = (p: number) => (p >= 85 ? ["ممتاز", "g"] : p >= 65 ? ["جيد", ""] : p >= 50 ? ["مقبول", "a"] : ["يحتاج دعمًا", "a"]);

export default async function Reports({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const me = await currentProfile();
  if (!me || !isStaff(me.role)) return null;
  const sp = await searchParams, cid = Number(sp.class) || null;
  const sb = await createClient();
  const [cls, studs, atts, ans] = await Promise.all([
    sb.from("classes").select("id, name").order("name"),
    sb.from("profiles").select("id, full_name, class_id").eq("role", "student").eq("active", true).order("full_name").limit(2000),
    sb.from("attempts").select("id, exam_id, student_id, percent, status").eq("status", "graded").limit(5000),
    sb.from("attempt_answers").select("is_correct, marks_awarded, max_marks, attempts!inner(status), questions(lesson_id, lessons(title))").eq("attempts.status", "graded").limit(8000),
  ]);
  const classes: any[] = cls.data || [], all: any[] = studs.data || [];
  const students = cid ? all.filter((s) => s.class_id === cid) : all;
  const ids = new Set(students.map((s) => s.id));
  const attempts: any[] = (atts.data || []).filter((a: any) => ids.has(a.student_id));

  const rows = students.map((s) => {
    const mine = attempts.filter((a) => a.student_id === s.id).map((a) => Number(a.percent));
    return { ...s, n: mine.length, avg: avg(mine), cls: classes.find((c) => c.id === s.class_id)?.name ?? "—" };
  });
  const ranked = rows.filter((r) => r.avg !== null).sort((a, b) => b.avg! - a.avg!);
  const idle = rows.filter((r) => r.n === 0).length;
  const byClass = classes.map((c) => {
    const xs = (atts.data || []).filter((a: any) => all.find((s) => s.id === a.student_id)?.class_id === c.id).map((a: any) => Number(a.percent));
    return { title: c.name, avg: avg(xs) ?? 0, n: xs.length };
  }).filter((c) => c.n > 0);

  // إتقان الدروس (من نتائج الأسئلة)
  const lm = new Map<string, { s: number; m: number }>();
  (ans.data || []).forEach((r: any) => {
    const t = r.questions?.lessons?.title; if (!t || (r.marks_awarded === null)) return;
    const o = lm.get(t) || { s: 0, m: 0 }; o.s += Number(r.marks_awarded); o.m += Number(r.max_marks); lm.set(t, o);
  });
  const lessons = Array.from(lm.entries()).map(([title, v]) => ({ title, avg: v.m ? (100 * v.s) / v.m : 0, n: Math.round(v.m) })).sort((a, b) => a.avg - b.avg);

  return (
    <>
      <div className="card no-print-border">
        <div className="sec"><h1 style={{ margin: 0 }}>التقارير والتحليلات</h1><PrintButton /></div>
        <form className="row" style={{ marginTop: 8 }}>
          <div><label>الصف</label><select name="class" defaultValue={cid ?? ""}><option value="">كل الصفوف</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <button>عرض</button>
        </form>
        <div className="stats" style={{ marginTop: 14 }}>
          <div className="stat"><div className="v">{students.length}</div><div className="l">طلاب</div></div>
          <div className="stat" style={{ ["--tint" as any]: "#E8E8FA" }}><div className="v">{avg(attempts.map((a) => Number(a.percent))) === null ? "—" : Math.round(avg(attempts.map((a) => Number(a.percent)))!) + "%"}</div><div className="l">متوسط الأداء</div></div>
          <div className="stat" style={{ ["--tint" as any]: "#FCEBD0" }}><div className="v">{idle}</div><div className="l">لم يسلّموا أي امتحان</div></div>
        </div>
      </div>

      <div className="panels" style={{ marginTop: 16 }}>
        <div className="card"><div className="sec"><h2>مقارنة الصفوف</h2></div>{byClass.length ? <ExamBars data={byClass} /> : <Empty text="لا توجد نتائج مصححة بعد." />}</div>
        <div className="card"><div className="sec"><h2>الدروس الأضعف (أولوية المراجعة)</h2></div>{lessons.length ? <ExamBars data={lessons.slice(0, 6)} /> : <Empty text="تظهر بعد تصحيح أسئلة مرتبطة بدروس." />}</div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec"><h2>أداء الطلاب</h2></div>
        {!rows.length ? <Empty text="لا يوجد طلاب." /> : (
          <div className="tbl"><table><thead><tr><th>#</th><th>الطالب</th><th>الصف</th><th>امتحانات</th><th>المتوسط</th><th>المستوى</th></tr></thead>
            <tbody>{[...ranked, ...rows.filter((r) => r.avg === null)].map((r, i) => (
              <tr key={r.id}><td>{i + 1}</td><td>{r.full_name}</td><td>{r.cls}</td><td>{r.n}</td>
                <td>{r.avg === null ? "—" : Math.round(r.avg) + "%"}</td>
                <td>{r.avg === null ? <span className="badge">لا نتائج</span> : <span className={"badge " + band(r.avg)[1]}>{band(r.avg)[0]}</span>}</td></tr>))}</tbody></table></div>)}
        <p className="muted"><Link href="/exams">لتفاصيل كل امتحان وتصحيح المقالي: افتح الامتحان ثم «النتائج».</Link></p>
      </div>
    </>
  );
}
