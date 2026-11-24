import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";
import { verifyChildCode } from "@/lib/parent";

// ولي أمر مسجّل يضيف ابنًا آخر بكود الابن
export async function POST(req: Request) {
  const g = await requireRole("parent");
  if ("err" in g) return g.err;
  const b = await req.json().catch(() => ({}));
  const sid = String(b.student_id || "");
  const bad = await verifyChildCode(sid, String(b.code || ""));
  if (bad) return NextResponse.json({ error: bad }, { status: 403 });
  const { error } = await createAdminClient().from("parent_students").upsert({ parent_id: g.me.id, student_id: sid });
  if (error) return NextResponse.json({ error: "تعذر الربط" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
