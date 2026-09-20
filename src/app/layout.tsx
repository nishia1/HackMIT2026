import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import TabBar from "@/components/TabBar";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Newsreader({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Invisible String",
  description: "There are more connections around you than you can see.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Invisible String", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#EDEAF2",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-full pb-24 font-body">
        <RegisterSW />
        <main className="mx-auto w-full max-w-[560px] px-5">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
