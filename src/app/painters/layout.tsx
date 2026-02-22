import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guess the Painting Artist',
  description: 'Test your art knowledge! Guess the artist behind famous paintings from the Met, Art Institute of Chicago, and Rijksmuseum. Buy hints with Solana micropayments and compete for weekly prizes.',
  alternates: { canonical: 'https://x402muse.com/painters' },
  openGraph: {
    title: 'Guess the Painting Artist - Muse x402',
    description: 'Test your art knowledge! Guess the artist behind famous paintings and compete for weekly SOL prizes.',
    url: 'https://x402muse.com/painters',
  },
};

export default function PaintersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
