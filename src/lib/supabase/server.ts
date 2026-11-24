import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** عميل Supabase يعمل بصلاحيات المستخدم الحالي (تُطبَّق عليه سياسات RLS). */
export async function createClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* استدعاء من Server Component: يتولى middleware تجديد الجلسة */
          }
        },
      },
    }
  );
}
