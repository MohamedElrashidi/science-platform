import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { db, overrideOf, ownAttempt, storeAnswers, finalize, GRACE_SAVE } from "@/lib/attempts";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("student");
  if ("err" in g) return g.err;
  const a = await ownAttempt(g.me, Number((await params).id));
  if (!a) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (a.status !== "in_progress") return NextResponse.json({ error: "تم تسليم هذه المحاولة" }, { status: 409 });
  const ov = await overrideOf(a.exam_id, g.me.id);
  if (ov.lock === "final") { await finalize(a.id); return NextResponse.json({ error: "انتهى الاختبار: أنهاه المعلم" }, { status: 409 }); }
  if (ov.lock === "temp") return NextResponse.json({ error: "أوقف المعلم الاختبار مؤقتًا" }, { status: 423 });
  const body = await req.json().catch(() => ({}));
  if (Number.isInteger(body.leaves) && body.leaves > 0 && body.leaves < 1000) await db().from("attempts").update({ leave_count: body.leaves }).eq("id", a.id).lt("leave_count", body.leaves);
  if (Number.isInteger(body.current) && body.current >= 0 && body.current < 1000) await db().from("attempts").update({ current_q: body.current }).eq("id", a.id);
  if (!(await storeAnswers(a, body.answers, GRACE_SAVE))) { await finalize(a.id); return NextResponse.json({ error: "انتهى وقت الاختبار" }, { status: 409 }); }
  return NextResponse.json({ ok: true });
}
