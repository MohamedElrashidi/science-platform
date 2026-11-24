import "server-only";
import { NextResponse } from "next/server";
import { currentProfile, type Profile, type Role } from "@/lib/auth";

/** يتحقق من الدور داخل مسارات API. يعيد الملف أو استجابة خطأ. */
export async function requireRole(...roles: Role[]): Promise<{ me: Profile } | { err: NextResponse }> {
  const me = await currentProfile();
  if (!me) return { err: NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 }) };
  if (!roles.includes(me.role)) return { err: NextResponse.json({ error: "غير مصرح" }, { status: 403 }) };
  return { me };
}
