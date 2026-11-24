import "server-only";
import { createClient } from "@supabase/supabase-js";

/** عميل بصلاحيات كاملة (يتجاوز RLS). للخادم فقط، وبعد التحقق من صلاحية المستخدم يدوياً. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
