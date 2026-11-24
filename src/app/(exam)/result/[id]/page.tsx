import Link from "next/link";
import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth";
import { db, ownAttempt, signMedia } from "@/lib/attempts";
import { describeAnswer, describeKey } from "@/lib/grading";

export default async function Result({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentProfile();
  if (!me || me.role !== "student") redirect("/dashboard");
  const a = await ownAttempt(me, Number((await params).id));
  if (!a) return <Msg t="لم نجد هذه المحاولة" />;
  const { data: e } = await db().from("exams").select("*").eq("id", a.exam_id).single();
  if (a.status === "in_progress") redirect(`/take/${a.exam_id}`);

  const pending = a.status === "submitted";
  const showScore = e.show_score && !pending;
  const pct = Math.round(Number(a.percent || 0));
  let review: any[] = [];
  if (e.show_answers) {
    const { data } = await db().from("attempt_answers")
      .select("question_id, answer, marks_awarded, max_marks, is_correct, needs_manual, feedback, questions(qtype, prompt, data, explanation, media_url)")
      .eq("attempt_id", a.id);
    const order = new Map<number, number>();
    const { data: eq } = await db().from("exam_questions").select("question_id, position").eq("exam_id", e.id);
    (eq || []).forEach((r) => order.set(r.question_id, r.position));
    review = await Promise.all((data || []).sort((x, y) => (order.get(x.question_id) ?? 0) - (order.get(y.question_id) ?? 0)).map(async (r: any) => ({
      ...r, img: await signMedia(r.questions.media_url),
      mine: describeAnswer(r.questions.qtype, r.questions.data, r.answer), key: describeKey(r.questions.qtype, r.questions.data),
    })));
  }
  const used = (await db().from("attempts").select("id", { count: "exact", head: true }).eq("exam_id", e.id).eq("student_id", me.id)).count ?? 0;

  return (
    <div className="ex" style={{ paddingBottom: 40 }}>
      <div className="card" style={{ marginTop: 24, textAlign: "center" }}>
        <h1 style={{ marginBottom: 4 }}>{e.title}</h1>
        {showScore ? (<>
          <div className="score-ring" style={{ ["--p" as any]: pct }}><div>{pct}%</div></div>
          <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{a.score} من {a.total} درجة</p>
          <p className="muted">{pct >= 85 ? "أداء ممتاز، أحسنت!" : pct >= 60 ? "أداء جيد، واصل التقدّم." : "راجع الدروس وحاول مرة أخرى."}</p>
        </>) : pending ? <p className="muted" style={{ fontSize: "1.1rem" }}>تم تسليم إجاباتك. بعض الأسئلة بانتظار تصحيح المعلم، وستظهر درجتك بعد ذلك.</p>
          : <p className="muted" style={{ fontSize: "1.1rem" }}>تم تسليم إجاباتك بنجاح. سيعرض المعلم النتائج لاحقًا.</p>}
        <div className="row" style={{ justifyContent: "center", marginTop: 10 }}>
          <Link className="btn ghost" href="/dashboard" style={{ textDecoration: "none", display: "inline-grid", placeItems: "center", background: "#fff", color: "var(--teal)", border: "1.5px solid var(--line)", boxShadow: "none" }}>الرئيسية</Link>
          {used < e.max_attempts && <Link className="btn" href={`/take/${e.id}`} style={{ textDecoration: "none", display: "inline-grid", placeItems: "center" }}>محاولة جديدة</Link>}
        </div>
      </div>

      {review.length > 0 && <h2 style={{ marginTop: 22 }}>مراجعة الإجابات</h2>}
      {review.map((r, k) => (
        <div key={r.question_id} className={"rv " + (r.needs_manual && r.marks_awarded === null ? "" : r.is_correct ? "right" : Number(r.marks_awarded) > 0 ? "" : "wrong")}>
          <div className="q-head"><span className="q-no">السؤال {k + 1}</span>
            <span className="badge">{r.needs_manual && r.marks_awarded === null ? "بانتظار التصحيح" : `${r.marks_awarded ?? 0} / ${r.max_marks}`}</span></div>
          {r.img && <img className="q-img" src={r.img} alt="" />}
          <p style={{ fontWeight: 700, whiteSpace: "pre-line" }}>{r.questions.prompt}</p>
          <p className="muted">إجابتك:</p><pre>{r.mine}</pre>
          {!r.is_correct && r.key && <><p className="muted">الإجابة الصحيحة:</p><pre><b>{r.key}</b></pre></>}
          {r.questions.explanation && <p className="muted">{r.questions.explanation}</p>}
          {r.feedback && <p>ملاحظة المعلم: {r.feedback}</p>}
        </div>
      ))}
    </div>
  );
}
const Msg = ({ t }: { t: string }) => <div className="center"><div className="card"><p>{t}</p><Link href="/dashboard">الرئيسية</Link></div></div>;
