import "./globals.css";
import "../styles/tokens.css";
import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = { title: "Chatter Quiz" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ background: "var(--bg)", color: "var(--text)" }}>
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}
