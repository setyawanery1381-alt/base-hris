import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ViewportSwitcher } from "@/components/layout/viewport-switcher";

export const metadata: Metadata = {
  title: "BASE HRIS — Enterprise Mobile & Web HR Platform",
  description: "Multi-Tenant White-Label Employee Lifecycle Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased selection:bg-teal-500 selection:text-white">
        <ThemeProvider>
          {children}
          <ViewportSwitcher />
        </ThemeProvider>
      </body>
    </html>
  );
}