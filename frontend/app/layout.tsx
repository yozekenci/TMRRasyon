import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TMR Rasyon Programı",
  description: "NRC 2023 tabanlı süt ve besi sığırı rasyon formülasyon programı",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full">
      <body className={`${inter.variable} h-full`}>
        <Providers>
          <div className="flex h-full">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-[var(--color-bg)]">
              <div className="max-w-5xl mx-auto px-6 py-7">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
