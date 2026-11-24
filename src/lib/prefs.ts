import "server-only";
import { cookies } from "next/headers";

export type Lang = "ar" | "en";
export type Theme = "light" | "dark" | "auto";

export async function getPrefs() {
  const c = await cookies();
  const lang: Lang = c.get("lang")?.value === "en" ? "en" : "ar";
  const t = c.get("theme")?.value;
  const theme: Theme = t === "dark" || t === "auto" ? t : "light";
  return { lang, theme };
}
