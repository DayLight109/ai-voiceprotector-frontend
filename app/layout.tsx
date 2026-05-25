import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, themeBootScript } from "@/lib/theme";
import { FontSizeProvider, fontSizeBootScript } from "@/lib/font-size";
import { I18nProvider, i18nBootScript } from "@/lib/i18n";
import { ToastProvider } from "@/components/shared/Toast";

export const metadata: Metadata = {
  title: "SENTINEL | AI Voice Protection Platform",
  description:
    "Real-time AI voice scam detection, evidence capture, and protection workflows.",
  metadataBase: new URL("https://sentinel.example"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: fontSizeBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: i18nBootScript }} />
      </head>
      <body className="bg-canvas text-ink antialiased">
        <ThemeProvider>
          <FontSizeProvider>
            <I18nProvider>
              <ToastProvider>
                <AuthProvider>{children}</AuthProvider>
              </ToastProvider>
            </I18nProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
