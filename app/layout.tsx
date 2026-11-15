import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PKLink — Anything you want to share. One scan away.",
    template: "%s · PKLink",
  },
  description:
    "Turn messages, photos, videos, documents and memories into beautiful pages that anyone can access by scanning a QR code.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
