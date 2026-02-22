import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SolanaProvider from "@/components/SolanaProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTracker from "@/components/PageTracker";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = 'https://x402muse.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Muse x402 - Trivia Game with Solana Micropayments',
    template: '%s | Muse x402',
  },
  description: 'Play Guess the Painting and Guess the School trivia games. Powered by the x402 Payment Protocol with Solana micropayments. Compete on weekly leaderboards and win SOL prizes.',
  keywords: ['x402', 'Solana', 'micropayments', 'trivia game', 'guess the painting', 'guess the school', 'blockchain game', 'web3 game', 'art trivia', 'university trivia'],
  authors: [{ name: 'Muse x402', url: siteUrl }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Muse x402',
    title: 'Muse x402 - Trivia Game with Solana Micropayments',
    description: 'Play Guess the Painting and Guess the School trivia games. Compete on weekly leaderboards and win SOL prizes.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Muse x402 - Trivia Game with Solana Micropayments',
    description: 'Play Guess the Painting and Guess the School. Compete for weekly SOL prizes.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Muse x402',
              url: siteUrl,
              description: 'Trivia game demonstrating the x402 Payment Protocol with Solana micropayments.',
              applicationCategory: 'GameApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
            }),
          }}
        />
      </head>
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <SolanaProvider>
          <PageTracker />
          <Header />
          {children}
          <Footer />
        </SolanaProvider>
      </body>
    </html>
  );
}
