import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import { getPrefs } from "@/lib/prefs";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "600", "700", "800"], display: "swap", variable: "--font-cairo" });

export const metadata: Metadata = {
  title: { default: "ELRASHIDI - PLATFORM", template: "%s | ELRASHIDI - PLATFORM" },
  description: "منصة عربية للاختبارات وأوراق العمل والأنشطة التفاعلية ومتابعة تقدم الطلاب",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ELRASHIDI - PLATFORM", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#142B45",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, theme } = await getPrefs();
  return (
    <html lang={lang} dir={lang === "en" ? "ltr" : "rtl"} data-theme={theme} className={cairo.variable}>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
