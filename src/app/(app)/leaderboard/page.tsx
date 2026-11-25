import { redirect } from "next/navigation";
import { currentProfile, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { competition } from "@/lib/leaderboard";
import Link from "next/link";

export default async function Leaderboard({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const me = await currentProfile();
  if (!me) redirect("/login");
  if (me.role === "parent") redirect("/dashboard");
  const sb = await createClient();
  const { data: classes } = await sb.from("classes").select("id, name").order("name");
  const q = Number((await searchParams).c);
  const cid = me.role === "student" ? Number(me.class_id) : (classes || []).some((c: any) => c.id === q) ? q : Number((classes || [])[0]?.id);
  const rows = cid ? await competition(cid) : [];
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <div className="card">
      <h1>منافسة الصف 🏆</h1>
      <p className="muted">الترتيب حسب عدد الإجابات الصحيحة في كل الاختبارات المعتمدة.</p>
      {isStaff(me.role) && <div className="row">{(classes || []).map((c: any) => <Link key={c.id} href={`/leaderboard?c=${c.id}`} className={"badge" + (c.id === cid ? " g" : "")} style={{ textDecoration: "none" }}>{c.name}</Link>)}</div>}
      <div className="tbl"><table>
        <thead><tr><th>#</th><th>الطالب</th><th>إجابات صحيحة</th><th>أسئلة حُلّت</th><th>اختبارات</th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.id} style={r.id === me.id ? { background: "var(--tint, #eef)" } : undefined}>
            <td>{medal[i] ?? i + 1}</td><td>{r.name}{r.id === me.id ? " (أنت)" : ""}</td><td><b>{r.correct}</b></td><td>{r.solved}</td><td>{r.exams}</td></tr>))}
          {!rows.length && <tr><td colSpan={5} className="muted">لا توجد نتائج بعد.</td></tr>}</tbody>
      </table></div>
    </div>
  );
}
