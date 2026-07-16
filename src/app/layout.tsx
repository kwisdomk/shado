import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHADO",
  description:
    "A local-first personal digital safety project for assessing suspicious Kenyan mobile messages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-KE">
      <body>{children}</body>
    </html>
  );
}