import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { ownAttempt, storeAnswers, finalize, GRACE_SAVE } from "@/lib/attempts";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("student");
  if ("err" in g) return g.err;
  const a = await ownAttempt(g.me, Number((await params).id));
  if (!a) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (a.status !== "in_progress") return NextResponse.json({ error: "تم تسليم هذه المحاولة" }, { status: 409 });
  const body = await req.json().catch(() => ({}));
  if (!(await storeAnswers(a, body.answers, GRACE_SAVE))) { await finalize(a.id); return NextResponse.json({ error: "انتهى وقت الاختبار" }, { status: 409 }); }
  return NextResponse.json({ ok: true });
}
