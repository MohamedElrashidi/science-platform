import Link from "next/link";
import type { Profile } from "@/lib/auth";
import { parentChildren, childReport } from "@/lib/parent";
import Avatar from "@/components/Avatar";
import AddChild from "./AddChild";
import ProgressChart from "@/components/ProgressChart";
import { ExamBars, Empty } from "@/components/Charts";

const band = (p: number): [string, string] => (p >= 85 ? ["ممتاز", "g"] : p >= 65 ? ["جيد", ""] : p >= 50 ? ["مقبول", "a"] : ["يحتاج دعمًا", "a"]);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("ar", { day: "numeric", month: "short" }) : "—");

export default async function ParentHome({ me, child }: { me: Profile; child?: string }) {
  const kids = await parentChildren(me.id);
  if (!kids.length) {
    return <><div className="card"><h1>أهلاً {me.full_name}</h1><Empty text="لم يُربط حسابك بأي طالب بعد. أضف ابنك بكوده." /></div><AddChild /></>;
  }
  const kid = kids.find((k) => k.id === child) ?? kids[0];
  const r = await childReport(kid);
  const pct = r.myAvg === null ? null : Math.round(r.myAvg);

  // تحليل تلقائي مبسّط
  const notes: string[] = [];
  if (pct === null) notes.push("لا توجد نتائج مصححة بعد، وسيظهر التحليل بعد تصحيح أول امتحان.");
  else {
    notes.push(`المتوسط العام ${pct}% (${band(pct)[0]}).`);
    if (r.classAvg !== null && r.of > 1) {
      const diff = Math.round(r.myAvg! - r.classAvg);
      notes.push(diff >= 3 ? `أعلى من متوسط الصف بـ ${diff} نقطة.` : diff <= -3 ? `أقل من متوسط الصف بـ ${-diff} نقطة.` : "قريب من متوسط الصف.");
    }
    if (r.exams.length >= 4) {
      const last = avg(r.exams.slice(-2).map((e) => e.percent)), before = avg(r.exams.slice(0, -2).map((e) => e.percent));
      const d = Math.round(last - before);
      notes.push(d >= 5 ? `الأداء في تحسّن: آخر امتحانين أعلى من السابق بـ ${d} نقطة.` : d <= -5 ? `لاحظنا تراجعًا في آخر امتحانين بمقدار ${-d} نقطة، يُنصح بالمتابعة.` : "مستوى الأداء مستقر.");
    }
    const strong = r.lessons.filter((l) => l.avg >= 75).slice(0, 3), weak = [...r.lessons].reverse().filter((l) => l.avg < 65).slice(0, 3);
    if (strong.length) notes.push("نقاط القوة: " + strong.map((l) => l.title).join("، ") + ".");
    if (weak.length) notes.push("يحتاج مراجعة: " + weak.map((l) => l.title).join("، ") + ".");
  }
  const weakList = [...r.lessons].reverse().slice(0, 5);

  return (
    <>
      <div className="card">
        <h1 style={{ marginBottom: 4 }}>أهلاً {me.full_name}</h1>
        <p className="muted" style={{ marginTop: 0 }}>متابعة الأبناء (للاطلاع فقط)</p>
        {kids.length > 1 && (
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {kids.map((k) => (
              <Link key={k.id} href={`/dashboard?child=${k.id}`} className={"btn" + (k.id === kid.id ? "" : " ghost")}
                style={{ textDecoration: "none", ...(k.id === kid.id ? {} : { background: "var(--card)", color: "var(--teal)", border: "1.5px solid var(--line)", boxShadow: "none" }) }}>{k.full_name}</Link>))}
          </div>)}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec" style={{ justifyContent: "flex-start", gap: 12 }}><Avatar id={kid.id} name={kid.full_name} size={52} /><h2>{kid.full_name}{r.className ? ` — ${r.className}` : ""}</h2></div>
        <div className="stats">
          <div className="stat"><div className="v">{pct === null ? "—" : pct + "%"}</div><div className="l">المتوسط العام</div></div>
          <div className="stat" style={{ ["--tint" as any]: "#E8E8FA" }}><div className="v">{r.rank ? `${r.rank} / ${r.of}` : "—"}</div><div className="l">الترتيب في الصف</div></div>
          <div className="stat" style={{ ["--tint" as any]: "#FCEBD0" }}><div className="v">{pct === null ? "—" : band(pct)[0]}</div><div className="l">المستوى</div></div>
          <div className="stat"><div className="v">{r.exams.length}</div><div className="l">امتحانات مصححة{r.pending ? ` (+${r.pending} بانتظار التصحيح)` : ""}</div></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec"><h2>تقدّم {kid.full_name} عبر الامتحانات</h2></div>
        <ProgressChart data={r.exams.slice(-10).map((e) => ({ label: e.title, value: e.percent }))} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec"><h2>تحليل الأداء</h2></div>
        <ul style={{ margin: 0, paddingInlineStart: 20, lineHeight: 2 }}>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </div>

      <div className="panels" style={{ marginTop: 16 }}>
        <div className="card"><div className="sec"><h2>نقاط القوة (أعلى الدروس)</h2></div>
          {r.lessons.length ? <ExamBars data={r.lessons.slice(0, 5)} /> : <Empty text="تظهر بعد تصحيح أسئلة مرتبطة بدروس." />}</div>
        <div className="card"><div className="sec"><h2>نقاط الضعف (تحتاج مراجعة)</h2></div>
          {weakList.length ? <ExamBars data={weakList} /> : <Empty text="تظهر بعد تصحيح أسئلة مرتبطة بدروس." />}</div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec"><h2>نتائج الامتحانات</h2></div>
        {!r.exams.length ? <Empty text="لا توجد نتائج مصححة بعد." /> : (
          <>
            <ExamBars data={r.exams.slice(-8).map((e) => ({ title: e.title, avg: e.percent, n: 1 }))} />
            <div className="tbl" style={{ marginTop: 12 }}><table><thead><tr><th>الامتحان</th><th>التاريخ</th><th>الدرجة</th><th>المستوى</th></tr></thead>
              <tbody>{[...r.exams].reverse().map((e) => (
                <tr key={e.id}><td>{e.title}</td><td>{fmt(e.at)}</td><td>{Math.round(e.percent)}%</td><td><span className={"badge " + band(e.percent)[1]}>{band(e.percent)[0]}</span></td></tr>))}</tbody></table></div>
          </>)}
      </div>
      <AddChild />
    </>
  );
}
