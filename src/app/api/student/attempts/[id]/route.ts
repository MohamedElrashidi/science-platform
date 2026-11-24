import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { db, ownAttempt, payload } from "@/lib/attempts";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("student");
  if ("err" in g) return g.err;
  const a = await ownAttempt(g.me, Number((await params).id));
  if (!a) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const { data: e } = await db().from("exams").select("*").eq("id", a.exam_id).single();
  return NextResponse.json(await payload(a, e));
}
