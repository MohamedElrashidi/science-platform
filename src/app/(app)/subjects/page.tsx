"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Sub = { id: number; name: string };
type Les = { id: number; subject_id: number; title: string; grade_level: string | null };

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Sub[]>([]);
  const [lessons, setLessons] = useState<Les[]>([]);
  const [name, setName] = useState("");
  const [sid, setSid] = useState("");
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("");
  const [err, setErr] = useState("");

  const load = () => api<{ subjects: Sub[]; lessons: Les[] }>("/api/subjects")
    .then((d) => { setSubjects(d.subjects); setLessons(d.lessons); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const post = async (body: object, reset: () => void) => {
    setErr("");
    try { await api("/api/subjects", "POST", body); reset(); load(); } catch (x: any) { setErr(x.message); }
  };

  return (
    <div className="card">
      <h1>المواد والدروس</h1>
      <form className="row" onSubmit={(e) => { e.preventDefault(); post({ name }, () => setName("")); }}>
        <div><label>مادة جديدة</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <button>إضافة مادة</button>
      </form>
      <form className="row" onSubmit={(e) => { e.preventDefault(); post({ kind: "lesson", subject_id: sid, title, grade_level: grade }, () => { setTitle(""); }); }}>
        <div><label>المادة</label>
          <select value={sid} onChange={(e) => setSid(e.target.value)} required>
            <option value="">اختر</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div><label>عنوان الدرس</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div><label>المرحلة</label><input value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
        <button>إضافة درس</button>
      </form>
      <p className="err">{err}</p>
      {subjects.map((s) => (
        <div key={s.id} style={{ marginTop: 12 }}>
          <strong>{s.name}</strong>
          <ul>{lessons.filter((l) => l.subject_id === s.id).map((l) => <li key={l.id}>{l.title}{l.grade_level ? ` (${l.grade_level})` : ""}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}
