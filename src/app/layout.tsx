import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: { default: "منصة العلوم التعليمية", template: "%s | منصة العلوم" },
  description: "منصة عربية للاختبارات وأوراق العمل والأنشطة التفاعلية ومتابعة تقدم الطلاب",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "منصة العلوم", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#1f5fd1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
