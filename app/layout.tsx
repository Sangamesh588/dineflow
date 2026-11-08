import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DineFlow - Multi-Tenant Restaurant QR Ordering & Management SaaS",
  description:
    "Production-grade restaurant platform for QR/NFC ordering, dynamic digital menus, kitchen operations, smart billing, and analytics.",
  keywords: [
    "restaurant SaaS",
    "QR ordering",
    "digital menu",
    "NFC restaurant ordering",
    "table billing",
    "KDS kitchen display",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans bg-charcoal text-cream antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
