import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Lead & SPK Manager",
  description: "Next.js + NestJS + PostgreSQL technical test application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
