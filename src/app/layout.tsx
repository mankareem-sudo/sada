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

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Sada";
const APP_NAME_AR = process.env.NEXT_PUBLIC_APP_NAME_AR || "صدى";
const DEVELOPER = process.env.NEXT_PUBLIC_DEVELOPER || "Sada Team";

export const metadata: Metadata = {
  title: `${APP_NAME_AR} — منصة الحوار الصوتي العربي`,
  description:
    `${APP_NAME_AR}: منصة اجتماعية صوتية عربية. كل يوم سؤال واحد، وإجابات صوتية مدتها 90 ثانية. منصة للحوار الهادئ بعيداً عن السخرية والإساءة.`,
  keywords: [
    APP_NAME_AR,
    APP_NAME,
    "صوت",
    "سوشيال ميديا",
    "عربي",
    "voice notes",
    "daily prompt",
  ],
  authors: [{ name: DEVELOPER }],
  applicationName: APP_NAME,
  creator: DEVELOPER,
  publisher: DEVELOPER,
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME_AR,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: `${APP_NAME_AR} — منصة الحوار الصوتي العربي`,
    description:
      "كل يوم سؤال واحد، وإجابات صوتية مدتها 90 ثانية. حوار هادئ بلا سخرية ولا إساءة.",
    siteName: APP_NAME_AR,
    type: "website",
    locale: "ar_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME_AR,
    description: "منصة الحوار الصوتي العربي",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

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
        <meta name="apple-mobile-web-app-title" content={APP_NAME_AR} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content={APP_NAME} />
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
