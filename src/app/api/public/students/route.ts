import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// أسماء طلاب صف واحد فقط (لاختيار الابن عند تسجيل ولي الأمر). لا تُعاد أي بيانات أخرى.
export async function GET(req: Request) {
  const cid = Number(new URL(req.url).searchParams.get("class"));
  if (!cid) return NextResponse.json([]);
  const { data } = await createAdminClient().from("profiles").select("id, full_name")
    .eq("role", "student").eq("active", true).eq("class_id", cid).order("full_name").limit(300);
  return NextResponse.json(data || []);
}
