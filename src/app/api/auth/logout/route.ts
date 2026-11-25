import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function out(req: Request) {
  try { const supabase = await createClient(); await supabase.auth.signOut(); } catch { /* نكمل التحويل حتى لو فشل */ }
  const origin = req.headers.get("x-forwarded-host") ? `https://${req.headers.get("x-forwarded-host")}` : new URL(req.url).origin;
  return NextResponse.redirect(new URL("/login", origin), { status: 303 });
}
export const POST = out;
export const GET = out;
