import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Role = "admin" | "teacher" | "student";
export type Profile = { id: string; role: Role; full_name: string; username: string; class_id: number | null };

export const STUDENT_DOMAIN = process.env.STUDENT_EMAIL_DOMAIN || "students.example.com";

export function studentEmail(username: string) {
  return `${username.toLowerCase()}@${STUDENT_DOMAIN}`;
}

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export type AuthState =
  | { status: "anonymous" }
  | { status: "no-profile"; reason: string }
  | { status: "ok"; profile: Profile };

/**
 * هوية المستخدم تُتحقق من الجلسة (getUser)، ثم يُقرأ ملفه بمفتاح الخادم باستخدام
 * المعرّف الموثَّق فقط، فلا يتوقف الدخول على سياسات RLS ولا تحدث حلقة تحويل.
 */
export async function authState(): Promise<AuthState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "anonymous" };

  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("id, role, full_name, username, class_id, active")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("profile fetch failed:", error.message);
    return { status: "no-profile", reason: `تعذر قراءة الملف الشخصي: ${error.message}` };
  }
  if (!data) return { status: "no-profile", reason: "لا يوجد ملف شخصي مرتبط بهذا الحساب (profiles)" };
  if (!data.active) return { status: "no-profile", reason: "الحساب موقوف" };
  return { status: "ok", profile: data as Profile };
}

/** المستخدم الحالي وملفه، أو null. */
export async function currentProfile(): Promise<Profile | null> {
  const s = await authState();
  return s.status === "ok" ? s.profile : null;
}
