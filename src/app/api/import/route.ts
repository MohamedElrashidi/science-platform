import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";
import { convertExam, normalizeExam } from "@/lib/qtypes";

type Result = { title: string; ok: boolean; skipped?: boolean; questions?: number; errors?: string[]; exam_id?: number };

// استيراد امتحان أو أكثر من JSON. الأسئلة تدخل بحالة «بانتظار الاعتماد»، والامتحان مسودة.
// الكتابة بصلاحيات المعلم نفسه (RLS)، فلا يستطيع الاستيراد باسم غيره.
export async function POST(req: Request) {
  const g = await requireRole("admin", "teacher");
  if ("err" in g) return g.err;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "الملف ليس JSON صالحاً" }, { status: 400 });
  const list: any[] = Array.isArray(body.exams) ? body.exams : [body];
  if (list.length > 30) return NextResponse.json({ error: "الحد 30 امتحاناً في المرة الواحدة" }, { status: 400 });

  const supabase = await createClient();
  const me = g.me.id;
  const results: Result[] = [];

  for (const raw of list) {
    const conv = convertExam(raw);
    const title = String(normalizeExam(raw)?.title ?? "بدون عنوان");
    if (!("ok" in conv)) { results.push({ title, ok: false, errors: conv.errors }); continue; }
    const ex = conv.ok;

    const { data: dup } = await supabase.from("exams").select("id").eq("owner_id", me).eq("title", ex.title).maybeSingle();
    if (dup) { results.push({ title: ex.title, ok: false, skipped: true, errors: ["امتحان بنفس العنوان موجود مسبقاً (لم يُستورد)"] }); continue; }

    // المادة والدرس: يُستعملان إن وُجدا وإلا يُنشآن
    let subject_id: number | null = null, lesson_id: number | null = null;
    if (ex.subject) {
      const { data: s } = await supabase.from("subjects").select("id").eq("name", ex.subject).maybeSingle();
      if (s) subject_id = s.id;
      else {
        const { data: ns } = await supabase.from("subjects").insert({ name: ex.subject }).select("id").single();
        subject_id = ns?.id ?? null;
      }
      if (subject_id && ex.lesson) {
        const { data: l } = await supabase.from("lessons").select("id").eq("subject_id", subject_id).eq("title", ex.lesson).maybeSingle();
        if (l) lesson_id = l.id;
        else {
          const { data: nl } = await supabase.from("lessons").insert({ subject_id, title: ex.lesson, grade_level: ex.grade_level }).select("id").single();
          lesson_id = nl?.id ?? null;
        }
      }
    }

    const { data: exam, error: eErr } = await supabase.from("exams").insert({
      owner_id: me, title: ex.title, kind: ex.kind, subject_id, lesson_id, grade_level: ex.grade_level,
      description: ex.description, duration_minutes: ex.duration_minutes, max_attempts: ex.max_attempts,
      shuffle_questions: ex.shuffle_questions, shuffle_options: ex.shuffle_options,
      show_answers: ex.show_answers, show_score: ex.show_score, practice_mode: ex.practice_mode, status: "draft",
    }).select("id").single();
    if (eErr || !exam) { results.push({ title: ex.title, ok: false, errors: ["تعذر إنشاء الامتحان"] }); continue; }

    // دروس الأسئلة (لكل سؤال درسه إن ذكره)
    const lessonIds = new Map<string, number | null>();
    for (const q of ex.questions) {
      if (!q.lesson || !subject_id || lessonIds.has(q.lesson)) continue;
      const { data: l } = await supabase.from("lessons").select("id").eq("subject_id", subject_id).eq("title", q.lesson).maybeSingle();
      if (l) lessonIds.set(q.lesson, l.id);
      else {
        const { data: nl } = await supabase.from("lessons").insert({ subject_id, title: q.lesson, grade_level: ex.grade_level }).select("id").single();
        lessonIds.set(q.lesson, nl?.id ?? null);
      }
    }

    const { data: qs, error: qErr } = await supabase.from("questions").insert(
      ex.questions.map((q) => ({
        owner_id: me, subject_id, lesson_id: (q.lesson && lessonIds.get(q.lesson)) || lesson_id, grade_level: ex.grade_level, qtype: q.qtype, prompt: q.prompt,
        instructions: q.instructions, media_kind: q.media_kind, media_url: q.media_url, data: q.data,
        explanation: q.explanation, marks: q.marks, difficulty: q.difficulty, status: "pending_review",
      }))
    ).select("id");
    if (qErr || !qs || qs.length !== ex.questions.length) {
      await supabase.from("exams").delete().eq("id", exam.id);
      results.push({ title: ex.title, ok: false, errors: ["تعذر حفظ الأسئلة"] }); continue;
    }
    const { error: lErr } = await supabase.from("exam_questions").insert(
      qs.map((q: { id: number }, i: number) => ({ exam_id: exam.id, question_id: q.id, position: i, marks: ex.questions[i].marks }))
    );
    if (lErr) {
      await supabase.from("questions").delete().in("id", qs.map((q: { id: number }) => q.id));
      await supabase.from("exams").delete().eq("id", exam.id);
      results.push({ title: ex.title, ok: false, errors: ["تعذر ربط الأسئلة بالامتحان"] }); continue;
    }
    results.push({ title: ex.title, ok: true, questions: qs.length, exam_id: exam.id });
  }
  return NextResponse.json({ results });
}
