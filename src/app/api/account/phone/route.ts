import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/guard";

// الطالب/ولي الأمر يسجّل رقم التواصل (واتساب) عند أول دخول
export async function POST(req: Request) {
  const g = await requireRole("student", "parent");
  if ("err" in g) return g.err;
  const b = await req.json().catch(() => ({}));
  const phone = String(b.phone || "").trim();
  const digits = phone.replace(/\D/g, "");
  if (!/^\+?[\d\s-]{8,20}$/.test(phone) || digits.length < 8 || digits.length > 15) {
    return NextResponse.json({ error: "اكتب رقمًا صحيحًا (أرقام فقط، مثل 0501234567)" }, { status: 400 });
  }
  const { error } = await createAdminClient().from("profiles").update({ phone }).eq("id", g.me.id);
  if (error) return NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
