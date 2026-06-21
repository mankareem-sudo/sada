import type { Metadata, Viewport } from "next";
import { Cairo, Tajawal } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "صدى — منصة الحوار الصوتي العربي",
  description:
    "صدى: منصة اجتماعية صوتية عربية. كل يوم سؤال واحد، وإجابات صوتية مدتها 90 ثانية. منصة للحوار الهادئ بعيداً عن السخرية والإساءة.",
  keywords: [
    "صدى",
    "Sada",
    "صوت",
    "سوشيال ميديا",
    "عربي",
    "voice notes",
    "daily prompt",
  ],
  authors: [{ name: "Sada Team" }],
  openGraph: {
    title: "صدى — منصة الحوار الصوتي العربي",
    description:
      "كل يوم سؤال واحد، وإجابات صوتية مدتها 90 ثانية. حوار هادئ بلا سخرية ولا إساءة.",
    siteName: "صدى",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const swScript = `
  // SW registration disabled in dev to prevent issues
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="صدى" />
      </head>
      <body
        className={`${cairo.variable} ${tajawal.variable} antialiased bg-background text-foreground font-tajawal`}
      >
        {children}
        <Toaster />
        <Sonner position="top-center" />
      </body>
    </html>
  );
}
