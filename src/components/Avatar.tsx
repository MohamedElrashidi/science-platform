"use client";
import { useState } from "react";

/** صورة المستخدم، وإن لم توجد تظهر أول حرف من الاسم. */
export default function Avatar({ id, name, size = 40, v = "" }: { id: string; name: string; size?: number; v?: string }) {
  const [bad, setBad] = useState(false);
  return (
    <div className="avatar" style={{ position: "relative", overflow: "hidden", width: size, height: size, minWidth: size, fontSize: size * 0.45 }}>
      {name.trim().charAt(0)}
      {!bad && <img src={`/api/avatar/${id}${v ? "?v=" + v : ""}`} alt="" onError={() => setBad(true)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
    </div>
  );
}
