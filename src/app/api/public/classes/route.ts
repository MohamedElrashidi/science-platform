import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { data } = await createAdminClient().from("classes").select("id, name").order("name");
  return NextResponse.json(data || []);
}
