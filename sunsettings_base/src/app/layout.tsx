import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Link from "next/link";
import { Menubar } from "@/components/ui/menubar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const suseMono = localFont({
  src: [
    {
      path: "../../public/fonts/SUSEMono-VariableFont_wght.ttf",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-suse-mono",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sunsettingsHeadline = localFont({
  src: [
    {
      path: "../../public/fonts/runefa.otf",
      weight: "400",
      style: "normal",
    },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "sunsettings",
  description: "Capture and share beautiful sunsets",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${suseMono.variable} antialiased h-screen overflow-hidden`}
      >
        <Menubar className="fixed left-0 right-0 top-0 h-16 px-2 z-20">
          <div className="flex w-full items-center">
            <div className="flex-1" />
            <Link
              href="/"
              className={`flex-1 text-center ${sunsettingsHeadline.className} text-white text-5xl md:text-4xl leading-none tracking-tight`}
            >
              sunsettings
            </Link>
            <nav className="flex-1" />
          </div>
        </Menubar>
        <main className="relative z-10  overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
