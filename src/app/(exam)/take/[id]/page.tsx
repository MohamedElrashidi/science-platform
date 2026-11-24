import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth";
import Runner from "./Runner";

export default async function Take({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentProfile();
  if (!me) redirect("/login");
  if (me.role !== "student") redirect("/exams");
  return <Runner examId={Number((await params).id)} />;
}
