import { currentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rankStudents } from "@/lib/awards";
import { Empty } from "@/components/Charts";

const MEDAL = ["🥇", "🥈", "🥉"];
const REWARD = ["ميدالية ذهبية + شهادة تقدير", "ميدالية فضية + شهادة تقدير", "ميدالية برونزية + شهادة تقدير"];

export default async function Awards({ searchParams }: { searchParams: Promise<{ class?: string; min?: string; n?: string }> }) {
  const me = await currentProfile();
  if (!me || me.role === "student") return null;
  const sp = await searchParams;
  const cid = Number(sp.class) || null;
  const min = Math.min(100, Math.max(1, Number(sp.min) || 90));
  const n = Math.min(20, Math.max(1, Number(sp.n) || 3));
  const sb = await createClient();
  const { data: cls } = await sb.from("classes").select("id, name").order("name");
  const ranked = await rankStudents(cid);
  const top = ranked.slice(0, n);
  const stars = ranked.filter((r) => r.avg >= min);
  const q = (o: Record<string, string | number | null>) =>
    "/certificate?" + Object.entries(o).filter(([, v]) => v !== null && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");

  return (
    <>
      <div className="card">
        <div className="sec"><h1 style={{ margin: 0 }}>المكافآت والشهادات</h1></div>
        <p className="muted">الترتيب حسب متوسط نتائج الامتحانات المصححة. اختر الصف ثم اطبع الشهادات.</p>
        <form className="row" style={{ marginTop: 8 }}>
          <div><label>الصف</label><select name="class" defaultValue={cid ?? ""}><option value="">كل الصفوف</option>{(cls || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label>عدد الأوائل</label><input name="n" type="number" min={1} max={20} defaultValue={n} style={{ width: 90 }} /></div>
          <div><label>حد التميّز (%)</label><input name="min" type="number" min={1} max={100} defaultValue={min} style={{ width: 90 }} /></div>
          <button>عرض</button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec"><h2>الأوائل</h2>
          {top.length > 0 && <a className="btn" href={q({ class: cid, n })} target="_blank">طباعة شهادات الأوائل ({top.length})</a>}
        </div>
        {!top.length ? <Empty text="لا توجد نتائج مصححة بعد." /> : (
          <div className="tbl"><table><thead><tr><th>المركز</th><th>الطالب</th><th>الصف</th><th>امتحانات</th><th>المتوسط</th><th>المكافأة المقترحة</th><th></th></tr></thead>
            <tbody>{top.map((r, i) => (
              <tr key={r.id}><td>{MEDAL[i] ?? i + 1} {i + 1}</td><td>{r.name}</td><td>{r.cls}</td><td>{r.n}</td><td>{Math.round(r.avg)}%</td>
                <td>{REWARD[i] ?? "شهادة تقدير"}</td>
                <td><a href={q({ student: r.id, rank: i + 1 })} target="_blank">شهادة</a></td></tr>))}</tbody></table></div>)}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="sec"><h2>المتفوقون (متوسط {min}% فأكثر)</h2>
          {stars.length > 0 && <a className="btn" href={q({ class: cid, min })} target="_blank">طباعة شهادات التميّز ({stars.length})</a>}
        </div>
        {!stars.length ? <Empty text="لا يوجد طلاب بهذا المتوسط بعد." /> : (
          <div className="tbl"><table><thead><tr><th>#</th><th>الطالب</th><th>الصف</th><th>المتوسط</th><th></th></tr></thead>
            <tbody>{stars.map((r, i) => (
              <tr key={r.id}><td>{i + 1}</td><td>{r.name}</td><td>{r.cls}</td><td>{Math.round(r.avg)}%</td>
                <td><a href={q({ student: r.id })} target="_blank">شهادة</a></td></tr>))}</tbody></table></div>)}
        <p className="muted">تُفتح الشهادة في صفحة جديدة، ثم اضغط «طباعة» واختر «حفظ بصيغة PDF» أو الطابعة.</p>
      </div>
    </>
  );
}
