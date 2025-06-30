import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "./components/GoogleAnalytics";

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
  description: "Professional image tools for format conversion, optimization, and processing. Convert between JPG, PNG, WebP and more formats quickly and efficiently.",
  keywords: "image converter, format converter, image tools, JPG to PNG, PNG to WebP, image optimization",
  authors: [{ name: "Image Toolbox" }],
  viewport: "width=device-width, initial-scale=1",
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
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
