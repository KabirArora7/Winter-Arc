import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Winter Arc 2026",
  description: "A two-person Winter Arc habit tracker.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
