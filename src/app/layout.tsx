import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SolanaProvider from "@/components/SolanaProvider";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Muse x402 - Demo of x402 protocol using gamification",
  description: "Guess the painting or school in this trivia game demonstrating the x402 Payment Protocol with Solana micropayments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <SolanaProvider>
          <Header />
          {children}
        </SolanaProvider>
      </body>
    </html>
  );
}
