import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MVP_COMMAND_CENTRE_NAME, RETENTIONOS_MARK } from "@/lib/mvp/cohesion";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${RETENTIONOS_MARK} — ${MVP_COMMAND_CENTRE_NAME}`,
  description:
    "Cohort net revenue LTV, contribution LTV, first-to-second within 90 days, Month +N active rates, and revenue durability posture on a deterministic demo dataset.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
