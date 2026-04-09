import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import PwaRegister from "./pwa-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OPE Osakidetza Quiz",
  description: "Aplicacion de preparacion para OPE Osakidetza - Temario Comun",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </SessionProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
