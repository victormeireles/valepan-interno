import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import ConditionalNavigation from "@/components/ConditionalNavigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Produção - Valepan",
  description: "Sistema mobile-first para registro de produção por etapas",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-app antialiased`}
      >
        <Suspense fallback={null}>
          <ConditionalNavigation />
        </Suspense>
        <div className="flex w-full flex-1 flex-col px-4 pb-6 sm:px-6 lg:px-8">
          <main className="w-full flex-1 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
