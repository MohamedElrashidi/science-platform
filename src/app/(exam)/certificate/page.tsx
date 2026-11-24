import { currentProfile, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rankStudents, type Ranked } from "@/lib/awards";
import PrintBar from "./PrintBar";

const ORD = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];

export default async function Certificates({ searchParams }: { searchParams: Promise<{ student?: string; class?: string; n?: string; min?: string; rank?: string }> }) {
  const me = await currentProfile();
  if (!me || !isStaff(me.role)) return <div className="center"><div className="card"><p className="err">هذه الصفحة للمعلمين فقط.</p></div></div>;
  const sp = await searchParams;
  const cid = Number(sp.class) || null;
  let items: (Ranked & { rank?: number })[] = [];
  if (sp.student) {
    const all = await rankStudents(null);
    const r = all.find((x) => x.id === sp.student);
    if (r) items = [{ ...r, rank: Number(sp.rank) || undefined }];
  } else if (sp.n) {
    items = (await rankStudents(cid)).slice(0, Math.min(20, Math.max(1, Number(sp.n) || 3))).map((r, i) => ({ ...r, rank: i + 1 }));
  } else if (sp.min) {
    const m = Number(sp.min) || 90;
    items = (await rankStudents(cid)).filter((r) => r.avg >= m);
  }
  const sb = await createClient();
  const { data: t } = await sb.from("profiles").select("full_name").eq("id", me.id).maybeSingle();
  const teacher = (t as any)?.full_name || me.full_name;
  const date = new Date().toLocaleDateString("ar-AE", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="cert-root">
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        .cert-root { background:#e9eef2; min-height:100dvh; }
        .cert { width:297mm; height:210mm; margin:12px auto; background:#fff; position:relative; overflow:hidden; page-break-after:always; break-after:page; box-shadow:0 4px 20px rgba(0,0,0,.15); color:#1D3045; }
        .cert .frame { position:absolute; inset:9mm; border:3px solid #176B70; border-radius:6mm; }
        .cert .frame2 { position:absolute; inset:12.5mm; border:1px solid #F4B66A; border-radius:4mm; }
        .cert .in { position:absolute; inset:18mm 24mm; display:flex; flex-direction:column; align-items:center; justify-content:space-between; text-align:center; }
        .cert .brand { font-weight:800; letter-spacing:2px; color:#142B45; font-size:20px; }
        .cert .school { color:#5E6E80; font-size:14px; }
        .cert h1 { font-size:54px; margin:6px 0; color:#176B70; }
        .cert .name { font-size:46px; font-weight:800; color:#142B45; border-bottom:2px solid #F4B66A; padding:0 30px 4px; }
        .cert .txt { font-size:20px; line-height:1.9; }
        .cert .medal { font-size:60px; }
        .cert .sig { display:flex; justify-content:space-around; width:100%; font-size:16px; }
        .cert .sig div { min-width:60mm; border-top:1px solid #142B45; padding-top:6px; }
        @media print { .cert-root { background:#fff; } .cert { margin:0; box-shadow:none; } .no-print { display:none !important; } }
      `}</style>
      <PrintBar count={items.length} />
      {!items.length && <div className="center"><div className="card"><p>لا توجد نتائج مصححة لإنشاء شهادات.</p></div></div>}
      {items.map((r) => (
        <div className="cert" key={r.id}>
          <div className="frame" /><div className="frame2" />
          <div className="in">
            <div><div className="brand">RASHIDI-LAB</div><div className="school">مدرسة الشيخ سعود بن صقر – فرع 1</div></div>
            <div>
              <div className="medal">{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : "🏅"}</div>
              <h1>شهادة تقدير</h1>
            </div>
            <div className="txt">تُمنح هذه الشهادة للطالب/الطالبة</div>
            <div className="name">{r.name}</div>
            <div className="txt">
              تقديرًا لتفوقه/ا في مادة العلوم بمتوسط درجات <b>{Math.round(r.avg)}%</b> في {r.n} {r.n > 2 && r.n < 11 ? "امتحانات" : "امتحان"}
              {r.rank && r.rank <= 10 ? <>، وحصوله/ا على <b>المركز {ORD[r.rank - 1]}</b> في {r.cls}</> : null}.
              <br />نتمنى له/ا دوام التوفيق والنجاح.
            </div>
            <div className="sig"><div>معلم المادة: {teacher}</div><div>التاريخ: {date}</div><div>إدارة المدرسة</div></div>
          </div>
        </div>
      ))}
    </div>
  );
}
