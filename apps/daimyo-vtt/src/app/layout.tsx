import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono, Noto_Serif_JP } from "next/font/google";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { buildThemeBootScript } from "@/lib/theme/boot-script";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"]
});

const notoSerif = Noto_Serif_JP({
  subsets: ["latin"],
  variable: "--font-noto-serif",
  weight: ["400", "500", "700", "900"]
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "700"]
});

export const metadata: Metadata = {
  title: "Daimyo VTT",
  description: "Mesa narrativa em tempo real para A Era das Espadas Quebradas.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Daimyo VTT"
  },
  other: {
    "mobile-web-app-capable": "yes"
  }
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover"
};


export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSerif.variable} ${mono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Script id="theme-boot" strategy="beforeInteractive">{buildThemeBootScript()}</Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
