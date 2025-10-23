import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Link from "next/link";
import { Menubar } from "@/components/ui/menubar";
import AddMiniAppButton from "@/components/AddMiniAppButton";
import "./globals.css";
import { Providers } from "./providers";
import FarcasterReady from "@/components/FarcasterReady";

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
        <Providers>
          <FarcasterReady />
          <Menubar className="fixed left-0 right-0 top-0 h-16 px-2 z-20">
            <div className="flex w-full items-center">
              <div className="flex-1 hidden md:flex items-center gap-4 px-3">
                <Link href="/" className="text-sm font-medium">
                  Home
                </Link>
                <Link href="/feed" className="text-sm font-medium">
                  Feed
                </Link>
                <Link href="/account" className="text-sm font-medium">
                  Account
                </Link>
              </div>
              <Link
                href="/"
                className={`flex-1 text-center ${sunsettingsHeadline.className} text-white text-5xl md:text-4xl leading-none tracking-tight`}
              >
                sunsettings
              </Link>
              <nav className="flex-1 flex items-center justify-end pr-3">
                <AddMiniAppButton />
              </nav>
            </div>
          </Menubar>
          <main className="absolute z-10 h-[calc(100vh-4rem)] w-screen overflow-hidden pt-16 pb-16">
            {children}
          </main>
          <Menubar className="fixed bottom-0 left-0 right-0 h-16 px-4 z-20 md:hidden border-t-2 border-black">
            <nav className="flex h-full w-full">
              <div className="flex-1 h-full flex items-center justify-center">
                <Link href="/" className="text-sm font-medium">
                  Home
                </Link>
              </div>
              <div className="flex-1 h-full flex items-center justify-center border-l-2 border-black">
                <Link href="/feed" className="text-sm font-medium">
                  Feed
                </Link>
              </div>
              <div className="flex-1 h-full flex items-center justify-center border-l-2 border-black">
                <Link href="/account" className="text-sm font-medium">
                  Account
                </Link>
              </div>
            </nav>
          </Menubar>
        </Providers>
      </body>
    </html>
  );
}
