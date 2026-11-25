// محرك التصحيح الآلي (منقول من النسخة المختبرة). يعمل على الخادم فقط ولا يصل إليه الطالب.
export type Grade = { frac: number; ok: boolean | null; manual: boolean };

const DIAC = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

export function normalize(text: unknown): string {
  if (text === null || text === undefined) return "";
  let t = String(text).trim().toLowerCase().replace(DIAC, "");
  t = t.replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي");
  t = t.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  t = t.replace(/\s+/g, " ").trim();
  return t.replace(/^[\s.،؛؟!]+|[\s.،؛؟!]+$/g, "");
}

const res = (frac: number, manual = false): Grade => {
  if (manual) return { frac: 0, ok: null, manual: true };
  const f = Math.max(0, Math.min(1, frac));
  return { frac: f, ok: f >= 0.999, manual: false };
};
const isEmpty = (a: any) => a === null || a === undefined || a === "" || (Array.isArray(a) && !a.length) ||
  (typeof a === "object" && !Array.isArray(a) && !Object.keys(a).length);

const G: Record<string, (d: any, a: any) => Grade> = {
  mcq(d, a) {
    const correct = new Set<string>((d.correct || []).map(String));
    const chosen = new Set<string>((Array.isArray(a) ? a : a === null || a === undefined || a === "" ? [] : [a]).map(String));
    if (!correct.size) return res(0);
    if (!d.multiple) return res(chosen.size === correct.size && [...chosen].every((x) => correct.has(x)) ? 1 : 0);
    let good = 0, bad = 0;
    chosen.forEach((c) => (correct.has(c) ? good++ : bad++));
    return res((good - bad) / correct.size);
  },
  tf(d, a) {
    if (a === null || a === undefined || a === "") return res(0);
    const v = typeof a === "boolean" ? a : ["true", "1", "صح"].includes(String(a).toLowerCase());
    return res(v === Boolean(d.correct) ? 1 : 0);
  },
  fill(d, a) {
    const blanks: string[][] = d.blanks || [];
    if (!blanks.length) return res(0);
    const arr = Array.isArray(a) ? a : [a];
    let hits = 0;
    blanks.forEach((acc, i) => {
      const g = normalize(arr[i]);
      if (g && acc.some((x) => normalize(x) === g)) hits++;
    });
    return res(hits / blanks.length);
  },
  short(d, a) {
    const acc: string[] = d.accepted || [];
    if (!acc.length) return res(0, true);
    const g = normalize(Array.isArray(a) ? a.join(" ") : a);
    return res(g && acc.some((x) => normalize(x) === g) ? 1 : 0);
  },
  matching(d, a) {
    const pairs: { left: string; right: string }[] = d.pairs || [];
    if (!pairs.length) return res(0);
    const m = a && typeof a === "object" && !Array.isArray(a) ? a : {};
    let hits = 0;
    pairs.forEach((p, i) => { if (m[String(i)] && normalize(m[String(i)]) === normalize(p.right)) hits++; });
    return res(hits / pairs.length);
  },
  dragdrop(d, a) {
    const items: { target: number }[] = d.items || [];
    if (!items.length) return res(0);
    const m = a && typeof a === "object" && !Array.isArray(a) ? a : {};
    let hits = 0;
    items.forEach((it, i) => { if (String(m[String(i)]) === String(it.target)) hits++; });
    return res(hits / items.length);
  },
  ordering(d, a) {
    const items: string[] = d.items || [];
    if (!items.length) return res(0);
    const arr = Array.isArray(a) ? a.slice(0, items.length) : [];
    let hits = 0;
    arr.forEach((idx, pos) => { if (String(idx) === String(pos)) hits++; });
    return res(hits / items.length);
  },
  essay() { return res(0, true); },
};

export function gradeAnswer(qtype: string, data: any, ans: any, maxMarks: number) {
  if (isEmpty(ans)) return { marks: 0, is_correct: false as boolean | null, needs_manual: false };
  const g = (G[qtype] || G.essay)(data || {}, ans);
  return { marks: g.manual ? null : Math.round(g.frac * maxMarks * 100) / 100, is_correct: g.manual ? null : g.ok, needs_manual: g.manual };
}

// ---------- ترتيب عشوائي ثابت بالبذرة ----------
function hash(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
export function rng(seed: string) {
  let a = hash(seed)();
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export type Q = { id: number; qtype: string; prompt: string; instructions: string | null; media_kind: string | null; media_url: string | null;
  data: any; marks: number; explanation?: string | null };

/** عرض السؤال للطالب بلا أي ما يكشف الإجابة الصحيحة. */
export function studentView(q: Q, seed: number, shuffleOptions: boolean) {
  const d = q.data || {}, r = rng(`${seed}-${q.id}`);
  let view: any = {};
  if (q.qtype === "mcq") {
    let opts = (d.options || []).map((o: any) => ({ id: String(o.id), text: o.text }));
    if (shuffleOptions) opts = shuffle(opts, r);
    view = { options: opts, multiple: Boolean(d.multiple) };
  } else if (q.qtype === "fill") view = { blank_count: (d.blanks || []).length };
  else if (q.qtype === "matching") {
    const pairs = d.pairs || [];
    view = { lefts: pairs.map((p: any) => p.left), rights: shuffle(pairs.map((p: any) => p.right), r) };
  } else if (q.qtype === "dragdrop") {
    view = { targets: d.targets || [], items: shuffle((d.items || []).map((it: any, i: number) => ({ id: i, text: it.text })), r) };
  } else if (q.qtype === "ordering") {
    const base = (d.items || []).map((s: string, i: number) => ({ id: i, text: s }));
    let items = base;
    for (let k = 0; k < 5; k++) { items = shuffle(base, r); if (base.length < 2 || items.some((x: any, i: number) => x.id !== i)) break; }
    view = { items };
  }
  return { id: q.id, qtype: q.qtype, prompt: q.prompt, instructions: q.instructions, media_kind: q.media_kind, media_url: q.media_url,
    media_alt: d.media_alt || null, style: d.style || null, time_limit: d.time_limit || null, passage: d.passage || null, section: d.section || null, marks: q.marks, ...view };
}

/** وصف الإجابة الصحيحة نصًا (للمراجعة بعد التسليم). */
export function describeKey(qtype: string, d: any): string {
  d = d || {};
  if (qtype === "mcq") { const m = new Map((d.options || []).map((o: any) => [String(o.id), o.text])); return (d.correct || []).map((c: any) => m.get(String(c)) ?? "؟").join("، "); }
  if (qtype === "tf") return d.correct ? "صح" : "خطأ";
  if (qtype === "fill") return (d.blanks || []).map((b: string[]) => b.join(" / ")).join(" | ");
  if (qtype === "short") return (d.accepted || []).join(" / ");
  if (qtype === "matching") return (d.pairs || []).map((p: any) => `${p.left} ← ${p.right}`).join("\n");
  if (qtype === "dragdrop") return (d.items || []).map((it: any) => `${it.text} ← ${(d.targets || [])[it.target] ?? "؟"}`).join("\n");
  if (qtype === "ordering") return (d.items || []).join(" ← ");
  return d.model_answer || "";
}

export function describeAnswer(qtype: string, d: any, a: any): string {
  d = d || {};
  if (isEmpty(a)) return "— بلا إجابة —";
  if (qtype === "mcq") { const m = new Map((d.options || []).map((o: any) => [String(o.id), o.text])); return (Array.isArray(a) ? a : [a]).map((x: any) => m.get(String(x)) ?? "؟").join("، "); }
  if (qtype === "tf") return a === true || ["true", "1"].includes(String(a).toLowerCase()) ? "صح" : "خطأ";
  if (qtype === "fill") return (Array.isArray(a) ? a : [a]).join(" | ");
  if (qtype === "matching" && typeof a === "object") return (d.pairs || []).map((p: any, i: number) => `${p.left} ← ${a[String(i)] ?? "؟"}`).join("\n");
  if (qtype === "dragdrop" && typeof a === "object") return (d.items || []).map((it: any, i: number) => `${it.text} ← ${(d.targets || [])[Number(a[String(i)])] ?? "؟"}`).join("\n");
  if (qtype === "ordering" && Array.isArray(a)) return a.map((i) => (d.items || [])[Number(i)] ?? "؟").join(" ← ");
  return String(a);
}
