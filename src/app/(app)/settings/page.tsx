"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export default function Settings() {
  const [name, setName] = useState(""), [pw, setPw] = useState(""), [pw2, setPw2] = useState("");
  const [m1, setM1] = useState(""), [m2, setM2] = useState("");
  async function saveName(e: React.FormEvent) { e.preventDefault(); setM1(""); try { await api("/api/account", "PATCH", { full_name: name }); setM1("تم الحفظ. حدّث الصفحة لرؤية الاسم الجديد."); } catch (x: any) { setM1(x.message); } }
  async function savePw(e: React.FormEvent) {
    e.preventDefault(); setM2("");
    if (pw !== pw2) { setM2("كلمتا المرور غير متطابقتين"); return; }
    try { await api("/api/account", "PATCH", { password: pw }); setM2("تم تغيير كلمة المرور"); setPw(""); setPw2(""); } catch (x: any) { setM2(x.message); }
  }
  return (
    <div className="panels">
      <form className="card" onSubmit={saveName}><h1>الاسم</h1>
        <label>الاسم الظاهر</label><input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        <p className={m1.startsWith("تم") ? "ok" : "err"}>{m1}</p><button>حفظ</button></form>
      <form className="card" onSubmit={savePw}><h1>كلمة المرور</h1>
        <label>كلمة المرور الجديدة (8 أحرف على الأقل)</label><input type="password" dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoComplete="new-password" />
        <label>إعادة الكتابة</label><input type="password" dir="ltr" value={pw2} onChange={(e) => setPw2(e.target.value)} required autoComplete="new-password" />
        <p className={m2.startsWith("تم") ? "ok" : "err"}>{m2}</p><button>تغيير</button></form>
    </div>
  );
}
