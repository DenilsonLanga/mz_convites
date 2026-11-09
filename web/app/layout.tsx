import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MZ Convites — Histórias que começam com um convite",
  description:
    "Convites de casamento personalizados, feitos com cuidado em Moçambique.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-MZ">
      <body className="antialiased">{children}</body>
    </html>
  );
}
