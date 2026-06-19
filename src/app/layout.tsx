import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { PWARegistrar } from "@/components/layout/PWARegistrar";
import { IOSInstallPrompt } from "@/components/layout/IOSInstallPrompt";

export const metadata: Metadata = {
  title: "Sales Spark CRM",
  description: "CRM Comercial Inteligente",
  icons: {
    icon: "/logo.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sales Spark",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <PWARegistrar />
          <IOSInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}

