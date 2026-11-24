import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "teacher" | "student";
export type Profile = { id: string; role: Role; full_name: string; username: string; class_id: number | null };

export const STUDENT_DOMAIN = process.env.STUDENT_EMAIL_DOMAIN || "students.example.com";

export function studentEmail(username: string) {
  return `${username.toLowerCase()}@${STUDENT_DOMAIN}`;
}

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

/** المستخدم الحالي وملفه، أو null. */
export async function currentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, username, class_id, active")
    .eq("id", user.id)
    .maybeSingle();
  if (error) console.error("profile fetch failed:", error.message);
  if (!data || !data.active) return null;
  return data as Profile;
}
