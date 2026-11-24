import { redirect } from "next/navigation";
import PhoneGate from "@/components/PhoneGate";
import { authState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ExamLayout({ children }: { children: React.ReactNode }) {
  const s = await authState();
  if (s.status === "anonymous") redirect("/login");
  if (s.status === "no-profile") return <div className="center"><div className="card"><p className="err">{s.reason}</p></div></div>;
  const p = s.profile;
  if ((p.role === "student" || p.role === "parent") && !p.phone?.trim()) return <PhoneGate role={p.role} name={p.full_name} />;
  return <div className="ex-bg">{children}</div>;
}
