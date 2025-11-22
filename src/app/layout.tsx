import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Talk at twd.",
  description:
    "A real-time chat playground built with Next.js 16 and InstantDB by twd.",
  metadataBase: new URL("https://chat-app-amber-gamma-33.vercel.app"),
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Talk at twd.",
    description:
      "A real-time chat playground built with Next.js 16 and InstantDB by twd.",
    url: "https://chat-app-amber-gamma-33.vercel.app",
    siteName: "Talk at twd.",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/twdlogo.png",
        width: 512,
        height: 512,
        alt: "Talk at twd. logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Talk at twd.",
    description:
      "A real-time chat playground built with Next.js 16 and InstantDB by twd.",
    images: ["/twdlogo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-50 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
