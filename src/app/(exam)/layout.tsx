import { redirect } from "next/navigation";
import { authState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ExamLayout({ children }: { children: React.ReactNode }) {
  const s = await authState();
  if (s.status === "anonymous") redirect("/login");
  if (s.status === "no-profile") return <div className="center"><div className="card"><p className="err">{s.reason}</p></div></div>;
  return <div className="ex-bg">{children}</div>;
}
