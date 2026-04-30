import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEB Readiness Copilot",
  description:
    "AEB-ready evidence readiness checks for trade compliance operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
