import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfile } from "@/lib/auth";
import Viewer from "./Viewer";

export default async function Open({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentProfile();
  if (!me) redirect("/login");
  const id = Number((await params).id);
  const { data: r } = await (await createClient()).from("resources").select("id, title, kind, source, filename, external_url").eq("id", id).maybeSingle();
  if (!r) return <div className="center"><div className="card"><p>غير متاح.</p><Link href="/dashboard">الرئيسية</Link></div></div>;
  return <Viewer r={r} student={me.role === "student"} />;
}
