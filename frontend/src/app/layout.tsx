import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MerchantProvider } from "@/context/MerchantContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ALAT Sabi - Voice-to-Ledger & Cashflow Underwriting Engine",
  description: "AI-Powered Voice-to-Ledger & MSME Cashflow Underwriting Engine for Wema Bank Hackaholics 7.0",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ALAT Sabi",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <MerchantProvider>
          {children}
        </MerchantProvider>
      </body>
    </html>
  );
}
