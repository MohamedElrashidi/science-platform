import { currentProfile } from "@/lib/auth";
import { getPrefs } from "@/lib/prefs";
import AvatarUpload from "@/components/AvatarUpload";
import SettingsForm from "./SettingsForm";

export default async function Settings() {
  const me = await currentProfile();
  if (!me) return null;
  const { lang, theme } = await getPrefs();
  return <><AvatarUpload id={me.id} name={me.full_name} /><div style={{ height: 16 }} /><SettingsForm staff={me.role === "admin" || me.role === "teacher"} lang={lang} theme={theme} name={me.full_name} /></>;
}
