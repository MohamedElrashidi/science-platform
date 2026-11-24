"use client";
import { useRef, useState } from "react";
import Avatar from "./Avatar";

// تصغير الصورة في المتصفح إلى 256×256 (قص من المنتصف) قبل الرفع
async function toSquareJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("x")); i.src = url; });
  const s = Math.min(img.width, img.height), S = 256;
  const c = document.createElement("canvas"); c.width = S; c.height = S;
  c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, S, S);
  URL.revokeObjectURL(url);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("x"))), "image/jpeg", 0.85));
}

export default function AvatarUpload({ id, name }: { id: string; name: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setMsg(""); setBusy(true);
    try {
      const blob = await toSquareJpeg(f);
      const r = await fetch("/api/avatar", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "تعذر الرفع");
      setV(String(Date.now())); setMsg("تم حفظ الصورة"); setTimeout(() => window.location.reload(), 600);
    } catch (x: any) { setMsg(x.message === "x" ? "تعذرت قراءة الصورة" : x.message); }
    setBusy(false);
  }
  async function remove() {
    if (!confirm("حذف الصورة؟")) return;
    await fetch("/api/avatar", { method: "DELETE" });
    window.location.reload();
  }
  return (
    <div className="card">
      <h1>صورتي</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Avatar key={v} id={id} name={name} size={88} v={v} />
        <div>
          <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
          <button disabled={busy} onClick={() => ref.current?.click()}>{busy ? "جارٍ الرفع…" : "اختيار صورة"}</button>{" "}
          <button className="ghost" disabled={busy} onClick={remove}>حذف الصورة</button>
          <p className={msg.startsWith("تم") ? "ok" : "err"} style={{ margin: "6px 0 0" }}>{msg}</p>
          <p className="muted" style={{ margin: "4px 0 0" }}>تظهر صورتك لك ولمعلمك ولولي أمرك فقط.</p>
        </div>
      </div>
    </div>
  );
}
