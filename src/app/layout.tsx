import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

import {AuthProvider} from "@/context/AuthContext";
import {CartProvider} from "@/context/CartContext";
import {Analytics} from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "ApnaBazaar",
  description: "Fast and easy e-commerce",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-slate-900 text-slate-50 antialiased`}><AuthProvider><CartProvider>{children}<Analytics/></CartProvider></AuthProvider></body>
    </html>
  );
}
