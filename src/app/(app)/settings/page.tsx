import { currentProfile } from "@/lib/auth";
import { getPrefs } from "@/lib/prefs";
import SettingsForm from "./SettingsForm";

export default async function Settings() {
  const me = await currentProfile();
  if (!me) return null;
  const { lang, theme } = await getPrefs();
  return <SettingsForm staff={me.role !== "student"} lang={lang} theme={theme} name={me.full_name} />;
}
