import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "./components/GoogleAnalytics";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Image Toolbox - Convert and Process Images Online",
  description: "Professional image tools by Lefty Studios for format conversion and processing. Most tools work client-side for maximum privacy and speed. Convert between AVIF, JPEG, PNG, and WebP.",
  keywords: "image converter, format converter, image tools, JPEG to PNG, PNG to WebP, image compression, client-side processing",
  authors: [{ name: "Lefty Studios" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
        </div>
        <GoogleAnalytics />
        <VercelSpeedInsights />
      </body>
    </html>
  );
}
