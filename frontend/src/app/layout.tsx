import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ALAT Sabi - Voice-to-Ledger Engine",
  description: "AI-Powered Voice-to-Ledger & MSME Cashflow Underwriting Engine for Wema Bank Hackaholics 7.0",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ALAT Sabi",
  },
};

export const viewport: Viewport = {
  themeColor: "#5B144B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
