import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Menubar } from "@/components/ui/menubar";
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen overflow-hidden`}
      >
        <Menubar className="top-0 h-16 px-2">
          <div className="flex w-full items-center">
            <div className="flex-1" />
            <Link
              href="/"
              className="flex-1 text-center font-['SunsettingsHeadline'] text-white text-5xl md:text-4xl leading-none tracking-tight"
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
