import type { Metadata } from "next";
import { Nunito, JetBrains_Mono, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, themeBootScript } from "@/lib/theme";
import { FontSizeProvider, fontSizeBootScript } from "@/lib/font-size";
import { I18nProvider, i18nBootScript } from "@/lib/i18n";
import { ToastProvider } from "@/components/shared/Toast";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SENTINEL · 声纹捕手 — 实时 AI 语音反诈平台",
  description:
    "毫秒级识别与拦截 AI 合成语音 · 来电溯源 × 声纹取证 × 话术语义三重引擎。",
  metadataBase: new URL("https://sentinel.example"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      lang="zh-CN"
      className={`${nunito.variable} ${jetbrains.variable} ${notoSans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: fontSizeBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: i18nBootScript }} />
      </head>
      <body className="bg-canvas text-ink antialiased">
        <ThemeProvider>
          <FontSizeProvider>
            <I18nProvider>
              <AuthProvider>
                <ToastProvider>{children}</ToastProvider>
              </AuthProvider>
            </I18nProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
