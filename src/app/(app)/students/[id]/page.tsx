import Link from "next/link";
import { currentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { childReport } from "@/lib/parent";
import ProgressChart from "@/components/ProgressChart";
import { ExamBars, Empty } from "@/components/Charts";

const band = (p: number): [string, string] => (p >= 85 ? ["ممتاز", "g"] : p >= 65 ? ["جيد", ""] : p >= 50 ? ["مقبول", "a"] : ["يحتاج دعمًا", "a"]);

export default async function StudentProgress({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentProfile();
  if (!me || (me.role !== "admin" && me.role !== "teacher")) return null;
  const id = (await params).id;
  const sb = await createClient();   // RLS: الطالب يظهر فقط إن كان ضمن طلاب هذا المعلم
  const { data: s } = await sb.from("profiles").select("id, full_name, class_id").eq("id", id).eq("role", "student").maybeSingle();
  if (!s) return <div className="card"><p className="err">لم نجد هذا الطالب.</p><Link href="/students">رجوع</Link></div>;
  const r = await childReport(s as any);
  const pct = r.myAvg === null ? null : Math.round(r.myAvg);
  return (
    <>
      <div className="card">
        <div className="sec"><h1 style={{ margin: 0 }}>{s.full_name}{r.className ? ` — ${r.className}` : ""}</h1><Link href="/students">رجوع للطلاب</Link></div>
        <div className="stats" style={{ marginTop: 12 }}>
          <div className="stat"><div className="v">{pct === null ? "—" : pct + "%"}</div><div className="l">المتوسط العام</div></div>
          <div className="stat" style={{ ["--tint" as any]: "#E8E8FA" }}><div className="v">{r.rank ? `${r.rank} / ${r.of}` : "—"}</div><div className="l">الترتيب في الصف</div></div>
          <div className="stat" style={{ ["--tint" as any]: "#FCEBD0" }}><div className="v">{pct === null ? "—" : band(pct)[0]}</div><div className="l">المستوى</div></div>
          <div className="stat"><div className="v">{r.exams.length}</div><div className="l">امتحانات مصححة</div></div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec"><h2>تقدّم الطالب عبر الامتحانات</h2></div>
        <ProgressChart data={r.exams.slice(-10).map((e) => ({ label: e.title, value: e.percent }))} />
      </div>
      <div className="panels" style={{ marginTop: 16 }}>
        <div className="card"><div className="sec"><h2>نقاط القوة</h2></div>{r.lessons.length ? <ExamBars data={r.lessons.slice(0, 5)} /> : <Empty text="تظهر بعد تصحيح أسئلة مرتبطة بدروس." />}</div>
        <div className="card"><div className="sec"><h2>نقاط الضعف</h2></div>{r.lessons.length ? <ExamBars data={[...r.lessons].reverse().slice(0, 5)} /> : <Empty text="تظهر بعد تصحيح أسئلة مرتبطة بدروس." />}</div>
      </div>
    </>
  );
}
