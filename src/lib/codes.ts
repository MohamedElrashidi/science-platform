import "server-only";
import { randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بلا حروف متشابهة (0/O, 1/I)
export const makeCode = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** يحفظ الكود للمعلم (إعادة الطباعة). فشل الحفظ لا يمنع الإنشاء. */
export async function saveCode(studentId: string, code: string) {
  const { error } = await createAdminClient()
    .from("student_codes").upsert({ student_id: studentId, code, updated_at: new Date().toISOString() });
  if (error) console.error("saveCode failed:", error.message);
}
