import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { ownAttempt, storeAnswers, finalize, GRACE_SUBMIT } from "@/lib/attempts";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("student");
  if ("err" in g) return g.err;
  const a = await ownAttempt(g.me, Number((await params).id));
  if (!a) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (a.status === "in_progress") {
    const body = await req.json().catch(() => ({}));
    await storeAnswers(a, body.answers, GRACE_SUBMIT);
    await finalize(a.id);
  }
  return NextResponse.json({ ok: true });
}
