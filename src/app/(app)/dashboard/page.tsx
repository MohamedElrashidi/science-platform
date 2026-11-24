import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentProfile } from "@/lib/auth";
import Icon from "@/components/Icon";
import AtomArt from "@/components/AtomArt";
import { WeeklyBars, ExamBars, Empty } from "@/components/Charts";

const DAY = 86400000;
const fmt = (d: string | Date) => new Date(d).toLocaleDateString("ar", { day: "numeric", month: "short" });
const tint = (t: string, a: string) => ({ "--tint": t, "--accent": a }) as React.CSSProperties;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function Stat({ icon, label, value, trend, t, a }: { icon: string; label: string; value: string; trend?: string; t: string; a: string }) {
  return (
    <div className="stat" style={tint(t, a)}>
      <div className="ic"><Icon name={icon} size={22} /></div>
      <div className="v">{value}</div>
      <div className="l">{label}</div>
      {trend && <div className="tr">{trend}</div>}
    </div>
  );
}

export default async function Dashboard() {
  const me = await currentProfile();
  if (!me) return null;   // الـ layout يعالج الحالتين (غير مسجل / بلا ملف)
  return me.role === "student" ? <StudentHome name={me.full_name} id={me.id} /> : <TeacherHome name={me.full_name} />;
}

async function TeacherHome({ name }: { name: string }) {
  const sb = await createClient();   // كل الاستعلامات تحت RLS: المعلم يرى صفوفه وطلابه واختباراته فقط
  const [cls, exams, att, studs, pendQ, pendMan] = await Promise.all([
    sb.from("classes").select("id, name"),
    sb.from("exams").select("id, title, status"),
    sb.from("attempts").select("id, exam_id, student_id, status, percent, submitted_at")
      .in("status", ["submitted", "graded"]).order("submitted_at", { ascending: false }).limit(1000),
    sb.from("profiles").select("id, full_name, class_id, created_at").eq("role", "student").order("created_at", { ascending: false }).limit(1000),
    sb.from("questions").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    sb.from("attempt_answers").select("attempt_id", { count: "exact", head: true }).eq("needs_manual", true).is("marks_awarded", null),
  ]);
  const classes: any[] = cls.data || [], examList: any[] = exams.data || [], attempts: any[] = att.data || [], students: any[] = studs.data || [];
  const examById = new Map(examList.map((e) => [e.id, e]));
  const studById = new Map(students.map((s) => [s.id, s]));
  const published = examList.filter((e) => e.status === "published").length;
  const graded = attempts.filter((a) => a.status === "graded" && a.percent !== null);
  const overall = avg(graded.map((a) => Number(a.percent)));

  const now = Date.now();
  const weeks = Array.from({ length: 8 }, (_, k) => ({ label: fmt(new Date(now - (7 - k) * 7 * DAY + DAY)), value: 0 }));
  attempts.forEach((a) => {
    if (!a.submitted_at) return;
    const k = Math.floor((now - new Date(a.submitted_at).getTime()) / (7 * DAY));
    if (k >= 0 && k < 8) weeks[7 - k].value++;
  });
  const thisW = weeks[7].value, prevW = weeks[6].value;
  const trend = prevW > 0 ? `${thisW >= prevW ? "▲" : "▼"} ${thisW} هذا الأسبوع مقابل ${prevW}` : thisW > 0 ? `${thisW} هذا الأسبوع` : undefined;

  const byExam = new Map<number, number[]>();
  graded.forEach((a) => { (byExam.get(a.exam_id) || byExam.set(a.exam_id, []).get(a.exam_id)!).push(Number(a.percent)); });
  const examBars = Array.from(byExam.entries())
    .map(([id, xs]) => ({ title: examById.get(id)?.title ?? "امتحان", avg: avg(xs)!, n: xs.length }))
    .sort((x, y) => y.n - x.n).slice(0, 6);

  const byClass = new Map<number, number[]>();
  graded.forEach((a) => {
    const c = studById.get(a.student_id)?.class_id;
    if (c) (byClass.get(c) || byClass.set(c, []).get(c)!).push(Number(a.percent));
  });
  const classBars = Array.from(byClass.entries())
    .map(([id, xs]) => ({ title: classes.find((c) => c.id === id)?.name ?? "صف", avg: avg(xs)!, n: xs.length }))
    .sort((x, y) => y.avg - x.avg);

  const alerts: { text: string; href?: string }[] = [];
  if ((pendQ.count ?? 0) > 0) alerts.push({ text: `${pendQ.count} سؤال بانتظار الاعتماد قبل نشر الامتحانات`, href: "/exams" });
  if ((pendMan.count ?? 0) > 0) alerts.push({ text: `${pendMan.count} إجابة بانتظار التصحيح اليدوي` });

  return (
    <>
      <section className="hero">
        <AtomArt className="art" size={260} />
        <h1>أهلاً، {name}</h1>
        <p>مختبرك الذكي للتعلّم: تابع طلابك وامتحاناتك ونتائجهم من مكان واحد.</p>
        <div className="actions">
          <Link href="/import" className="a1"><Icon name="upload" size={18} />استيراد امتحان</Link>
          <Link href="/students" className="a2"><Icon name="plus" size={18} />إضافة طلاب</Link>
          <Link href="/classes" className="a2"><Icon name="layers" size={18} />الصفوف</Link>
        </div>
      </section>

      <section className="stats">
        <Stat icon="users" label="إجمالي الطلاب" value={String(students.length)} t="#DDF3EF" a="#176B70" />
        <Stat icon="layers" label="الصفوف النشطة" value={String(classes.length)} t="#E8E8FA" a="#142B45" />
        <Stat icon="exam" label="امتحانات منشورة" value={String(published)} t="#DDF3EF" a="#176B70" />
        <Stat icon="check" label="تسليمات مكتملة" value={String(attempts.length)} trend={trend} t="#E8E8FA" a="#142B45" />
        <Stat icon="trend" label="متوسط أداء الطلاب" value={overall === null ? "—" : `${Math.round(overall)}%`} t="#FCEBD0" a="#8A5A12" />
      </section>

      {alerts.length > 0 && <div style={{ marginBottom: 16 }}>{alerts.map((a, i) => (
        <div key={i} className="alert"><Icon name="spark" size={18} /><span>{a.text}{a.href && <> — <Link href={a.href}>فتح</Link></>}</span></div>
      ))}</div>}

      <section className="panels">
        <div className="card"><div className="sec"><h2>النشاط الأسبوعي</h2><span className="badge">آخر 8 أسابيع</span></div><WeeklyBars data={weeks} /></div>
        <div className="card"><div className="sec"><h2>أداء الامتحانات</h2><span className="badge g">متوسط الدرجات</span></div><ExamBars data={examBars} /></div>
      </section>

      <section className="panels">
        <div className="card"><div className="sec"><h2>مقارنة الصفوف</h2></div>
          {classBars.length ? <ExamBars data={classBars} /> : <Empty text="تظهر المقارنة بعد تصحيح تسليمات طلاب من أكثر من صف." />}</div>
        <div className="card"><div className="sec"><h2>حالة الامتحانات</h2></div>
          <div className="badges">
            <div className="bdg"><div className="bi"><Icon name="exam" /></div>{examList.length} إجمالي</div>
            <div className="bdg"><div className="bi"><Icon name="check" /></div>{published} منشور</div>
            <div className="bdg locked"><div className="bi"><Icon name="file" /></div>{examList.length - published} مسودة</div>
          </div></div>
      </section>

      <section className="panels">
        <div className="card"><div className="sec"><h2>أحدث التسليمات</h2></div>
          {attempts.length === 0 ? <Empty text="لا توجد تسليمات بعد." /> : (
            <div className="feed">{attempts.slice(0, 5).map((a) => (
              <div className="it" key={a.id}><div className="dot">{(studById.get(a.student_id)?.full_name ?? "؟").charAt(0)}</div>
                <div className="tx">{studById.get(a.student_id)?.full_name ?? "طالب"}<small>{examById.get(a.exam_id)?.title ?? "امتحان"} — {a.submitted_at ? fmt(a.submitted_at) : ""}</small></div>
                {a.status === "graded" && a.percent !== null ? <span className="badge g">{Math.round(Number(a.percent))}%</span> : <span className="badge a">بانتظار التصحيح</span>}</div>
            ))}</div>)}</div>
        <div className="card"><div className="sec"><h2>طلاب جدد</h2><Link href="/students">كل الطلاب</Link></div>
          {students.length === 0 ? <Empty text="لا يوجد طلاب بعد." /> : (
            <div className="feed">{students.slice(0, 5).map((s) => (
              <div className="it" key={s.id}><div className="dot l">{s.full_name.charAt(0)}</div>
                <div className="tx">{s.full_name}<small>{classes.find((c) => c.id === s.class_id)?.name ?? "بلا صف"} — {fmt(s.created_at)}</small></div></div>
            ))}</div>)}</div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="sec"><h2>إجراءات سريعة</h2></div>
        <div className="qa">
          <Link href="/import"><span className="qi"><Icon name="exam" /></span>استيراد امتحان</Link>
          <Link href="/students"><span className="qi"><Icon name="plus" /></span>إضافة طالب</Link>
          <span><span className="qi"><Icon name="file" /></span>إنشاء ورقة عمل<em>قريباً</em></span>
          <span><span className="qi"><Icon name="spark" /></span>نشاط تفاعلي<em>قريباً</em></span>
        </div>
      </section>
    </>
  );
}

async function StudentHome({ name, id }: { name: string; id: string }) {
  const sb = await createClient();   // الطالب يرى امتحاناته المنشورة المسندة ومحاولاته فقط (RLS)
  const [ex, at, rs] = await Promise.all([
    sb.from("exams").select("id, title, duration_minutes, max_attempts, show_score, kind").eq("status", "published"),
    sb.from("attempts").select("id, exam_id, status, percent, submitted_at").eq("student_id", id).order("started_at", { ascending: false }),
    sb.from("resources").select("id, title, kind, source").eq("status", "published").order("id", { ascending: false }),
  ]);
  const res: any[] = rs.data || [];
  const exams: any[] = ex.data || [], attempts: any[] = at.data || [];
  const showScore = new Map(exams.map((e) => [e.id, e.show_score]));
  const done = attempts.filter((a) => a.status !== "in_progress");
  const scored = done.filter((a) => a.status === "graded" && a.percent !== null && showScore.get(a.exam_id) === true).map((a) => Number(a.percent));
  const mean = avg(scored);
  const used = new Map<number, number>();
  attempts.forEach((a) => used.set(a.exam_id, (used.get(a.exam_id) || 0) + 1));
  const inProg = new Set(attempts.filter((a) => a.status === "in_progress").map((a) => a.exam_id));
  const available = exams.filter((e) => (used.get(e.id) || 0) < e.max_attempts);

  const badges = [
    { t: "أول امتحان مكتمل", on: done.length >= 1, icon: "check" },
    { t: "خمسة امتحانات", on: done.length >= 5, icon: "layers" },
    { t: "متفوق (٨٥٪ فأكثر)", on: scored.length >= 3 && (mean ?? 0) >= 85, icon: "spark" },
  ];

  return (
    <>
      <section className="hero">
        <AtomArt className="art" size={260} />
        <h1>أهلاً، {name}</h1>
        <p>مرحباً بك في مختبر العلوم. اكتشف، تعلّم، وتابع تقدّمك خطوة بخطوة.</p>
      </section>

      <section className="stats">
        <Stat icon="exam" label="امتحانات متاحة" value={String(available.length)} t="#DDF3EF" a="#176B70" />
        <Stat icon="check" label="امتحانات مكتملة" value={String(done.length)} t="#E8E8FA" a="#142B45" />
        <Stat icon="trend" label="متوسط درجاتي" value={mean === null ? "—" : `${Math.round(mean)}%`} t="#FCEBD0" a="#8A5A12" />
      </section>

      <section className="panels">
        <div className="card"><div className="sec"><h2>الامتحانات المتاحة</h2></div>
          {available.length === 0 ? <Empty text="لا توجد امتحانات متاحة لك الآن." /> : (
            <div className="feed">{available.map((e) => (
              <div className="it" key={e.id}><div className="dot"><Icon name="exam" size={18} /></div>
                <div className="tx">{e.title}<small>{e.duration_minutes ? `${e.duration_minutes} دقيقة` : "بلا حد زمني"} — المحاولات: {used.get(e.id) || 0} / {e.max_attempts}</small></div>
                <Link href={`/take/${e.id}`} className="badge g" style={{ textDecoration: "none" }}>{inProg.has(e.id) ? "متابعة" : "ابدأ"}</Link></div>
            ))}</div>)}</div>
        <div className="card"><div className="sec"><h2>إنجازاتي</h2></div>
          <div className="badges">{badges.map((b, i) => (
            <div key={i} className={"bdg" + (b.on ? "" : " locked")}><div className="bi"><Icon name={b.icon} /></div>{b.t}</div>
          ))}</div></div>
      </section>

      {res.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="sec"><h2>أوراق العمل والأنشطة</h2></div>
          <div className="feed">{res.map((r) => (
            <Link key={r.id} href={`/open/${r.id}`} className="it" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="dot l"><Icon name={r.kind === "activity" ? "spark" : "file"} size={18} /></div>
              <div className="tx">{r.title}<small>{r.kind === "activity" ? "نشاط تفاعلي" : "ورقة عمل"}</small></div>
              <span className="badge g">فتح</span></Link>
          ))}</div>
        </section>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <div className="sec"><h2>نتائجي الأخيرة</h2></div>
        {done.length === 0 ? <Empty text="ستظهر نتائجك هنا بعد تسليم أول امتحان." /> : (
          <div className="feed">{done.slice(0, 5).map((a) => (
            <div className="it" key={a.id}><div className="dot l"><Icon name="check" size={18} /></div>
              <Link href={`/result/${a.id}`} className="tx" style={{ textDecoration: "none", color: "inherit" }}>{exams.find((e) => e.id === a.exam_id)?.title ?? "امتحان"}<small>{a.submitted_at ? fmt(a.submitted_at) : ""}</small></Link>
              {a.status === "graded" && a.percent !== null && showScore.get(a.exam_id) === true
                ? <span className="badge g">{Math.round(Number(a.percent))}%</span> : <span className="badge a">قيد التصحيح</span>}</div>
          ))}</div>)}
      </section>
    </>
  );
}
