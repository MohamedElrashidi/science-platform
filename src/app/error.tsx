"use client";

// يعرض أي خطأ بدل صفحة بيضاء (يفيد في التشخيص)
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="center">
      <div className="card" style={{ maxWidth: 520 }}>
        <h1>حدث خطأ</h1>
        <p className="muted">تعذر عرض الصفحة. أرسل هذا الرمز للدعم:</p>
        <pre dir="ltr" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#f5f7fb", padding: 10, borderRadius: 8 }}>
          {error.digest || error.message}
        </pre>
        <button onClick={() => reset()}>إعادة المحاولة</button>{" "}
        <a href="/login">صفحة الدخول</a>
      </div>
    </div>
  );
}
