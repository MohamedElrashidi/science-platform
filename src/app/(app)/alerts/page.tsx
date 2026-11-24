import { currentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Empty } from "@/components/Charts";

const DEFAULT_MSG = "السلام عليكم ورحمة الله، ولي أمر الطالب/ة {name}.\nنود إعلامكم بأن درجته/ا في «{exam}» كانت {pct}% ({reason}).\nنرجو متابعته/ا ومراجعة الدروس معه/ا. معلم العلوم: {teacher}";

function waNumber(raw: string, cc: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = cc + d.slice(1);
  else if (d.length <= 9) d = cc + d;
  return d;
}

export default async function Alerts({ searchParams }: { searchParams: Promise<{ thr?: string; drop?: string; cc?: string; msg?: string; class?: string }> }) {
  const me = await currentProfile();
  if (!me || (me.role !== "admin" && me.role !== "teacher")) return null;
  const sp = await searchParams;
  const thr = Math.min(100, Math.max(1, Number(sp.thr) || 50));
  const drop = Math.min(100, Math.max(1, Number(sp.drop) || 15));
  const cc = (sp.cc || "971").replace(/\D/g, "") || "971";
  const msg = sp.msg?.trim() || DEFAULT_MSG;
  const cid = Number(sp.class) || null;

  const sb = await createClient();   // RLS: طلاب هذا المعلم فقط
  const [cls, studs, atts] = await Promise.all([
    sb.from("classes").select("id, name").order("name"),
    sb.from("profiles").select("id, full_name, class_id, phone").eq("role", "student").eq("active", true).limit(2000),
    sb.from("attempts").select("student_id, percent, submitted_at, exams(title)").eq("status", "graded").order("submitted_at", { ascending: true }).limit(5000),
  ]);
  const students = ((studs.data || []) as any[]).filter((s) => !cid || s.class_id === cid);
  const ids = new Set(students.map((s) => s.id));
  const by = new Map<string, any[]>();
  ((atts.data || []) as any[]).forEach((a) => { if (!ids.has(a.student_id)) return; const l = by.get(a.student_id) || []; l.push(a); by.set(a.student_id, l); });

  // أرقام أولياء الأمور المرتبطين بهؤلاء الطلاب
  const d = createAdminClient();
  const { data: links } = await d.from("parent_students").select("parent_id, student_id").in("student_id", Array.from(ids).slice(0, 1000));
  const pids = Array.from(new Set((links || []).map((l: any) => l.parent_id)));
  const { data: pars } = pids.length ? await d.from("profiles").select("id, full_name, phone").in("id", pids) : { data: [] as any[] };
  const pmap = new Map<string, any>((pars || []).map((p: any) => [p.id, p]));

  type Row = { id: string; name: string; exam: string; pct: number; reason: string; phone: string | null; parent: string | null };
  const rows: Row[] = [];
  for (const s of students) {
    const list = by.get(s.id) || [];
    if (!list.length) continue;
    const last = list[list.length - 1], pct = Math.round(Number(last.percent));
    const reasons: string[] = [];
    if (pct < thr) reasons.push("درجة متدنية");
    if (list.length >= 2) {
      const prev = list.slice(0, -1).map((a) => Number(a.percent));
      const pa = prev.reduce((a, b) => a + b, 0) / prev.length;
      if (pa - pct >= drop) reasons.push(`هبوط عن متوسطه السابق ${Math.round(pa)}%`);
    }
    if (!reasons.length) continue;
    const par = (links || []).filter((l: any) => l.student_id === s.id).map((l: any) => pmap.get(l.parent_id)).find((p: any) => p?.phone);
    rows.push({ id: s.id, name: s.full_name, exam: last.exams?.title || "الامتحان", pct, reason: reasons.join(" + "), phone: par?.phone || s.phone || null, parent: par?.full_name || null });
  }
  rows.sort((a, b) => a.pct - b.pct);

  const link = (r: Row) => {
    const text = msg.replaceAll("{name}", r.name).replaceAll("{exam}", r.exam).replaceAll("{pct}", String(r.pct)).replaceAll("{reason}", r.reason).replaceAll("{teacher}", me.full_name);
    return `https://wa.me/${waNumber(r.phone!, cc)}?text=${encodeURIComponent(text)}`;
  };

  return (
    <>
      <div className="card">
        <h1>تنبيهات أولياء الأمور</h1>
        <p className="muted">الطلاب الذين نزلت درجتهم في آخر امتحان عن الحد، أو هبط مستواهم. اضغط «واتساب» فتفتح الرسالة جاهزة وتضغط إرسال بنفسك.</p>
        <form style={{ marginTop: 8 }}>
          <div className="row">
            <div><label>الصف</label><select name="class" defaultValue={cid ?? ""}><option value="">كل الصفوف</option>{(cls.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label>الدرجة أقل من (%)</label><input name="thr" type="number" min={1} max={100} defaultValue={thr} style={{ width: 90 }} /></div>
            <div><label>أو هبوط بمقدار (نقطة)</label><input name="drop" type="number" min={1} max={100} defaultValue={drop} style={{ width: 90 }} /></div>
            <div><label>رمز الدولة</label><input name="cc" defaultValue={cc} dir="ltr" style={{ width: 80 }} /></div>
          </div>
          <label style={{ marginTop: 10 }}>نص الرسالة (المتغيرات: {"{name} {exam} {pct} {reason} {teacher}"})</label>
          <textarea name="msg" rows={4} defaultValue={msg} style={{ width: "100%" }} />
          <button style={{ marginTop: 8 }}>تحديث</button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>الطلاب المطلوب إبلاغ أولياء أمورهم ({rows.length})</h2>
        {!rows.length ? <Empty text="لا توجد حالات حسب هذه الشروط." /> : (
          <div className="tbl"><table><thead><tr><th>الطالب</th><th>الامتحان</th><th>الدرجة</th><th>السبب</th><th>ولي الأمر</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}><td>{r.name}</td><td>{r.exam}</td><td>{r.pct}%</td><td>{r.reason}</td>
                <td>{r.parent || "—"}{r.phone ? <span dir="ltr" className="muted"> {r.phone}</span> : null}</td>
                <td>{r.phone ? <a className="btn" href={link(r)} target="_blank" rel="noopener">واتساب</a> : <span className="muted">لا يوجد رقم</span>}</td></tr>))}</tbody></table></div>)}
        <p className="muted">يُؤخذ رقم ولي الأمر من حسابه في «أولياء الأمور»، وإن لم يوجد فرقم الطالب المسجل. الأرقام التي تبدأ بصفر يُضاف لها رمز الدولة.</p>
      </div>
    </>
  );
}
