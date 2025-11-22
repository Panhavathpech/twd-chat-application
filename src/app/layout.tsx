import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ViewportZoomReset from "@/components/ViewportZoomReset";

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
        url: "/share-card.png",
        width: 1200,
        height: 630,
        alt: "Talk at twd. preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Talk at twd.",
    description:
      "A real-time chat playground built with Next.js 16 and InstantDB by twd.",
    images: ["/share-card.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
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
        <ViewportZoomReset />
        {children}
      </body>
    </html>
  );
}
