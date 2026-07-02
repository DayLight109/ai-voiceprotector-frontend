import type { Metadata } from "next";
import { Nunito, JetBrains_Mono, Noto_Sans_SC, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, themeBootScript } from "@/lib/theme";
import { FontSizeProvider, fontSizeBootScript } from "@/lib/font-size";
import { AppearanceProvider, appearanceBootScript } from "@/lib/appearance";
import { I18nProvider, i18nBootScript } from "@/lib/i18n";
import { ToastProvider } from "@/components/shared/Toast";
import { ConfirmProvider } from "@/components/shared/Confirm";

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

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SENTINEL · 声纹捕手 — 实时 AI 语音反诈平台",
  description:
    "毫秒级识别与拦截 AI 语音诈骗 · 来电溯源 × Whisper 转写 × 话术语义三重引擎。",
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
      className={`${nunito.variable} ${jetbrains.variable} ${notoSans.variable} ${plusJakarta.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: fontSizeBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: appearanceBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: i18nBootScript }} />
      </head>
      <body className="bg-canvas text-ink antialiased">
        <ThemeProvider>
          <FontSizeProvider>
            <AppearanceProvider>
              <I18nProvider>
                <AuthProvider>
                  <ToastProvider>
                    <ConfirmProvider>{children}</ConfirmProvider>
                  </ToastProvider>
                </AuthProvider>
              </I18nProvider>
            </AppearanceProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
