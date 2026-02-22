import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guess the School',
  description: 'Can you identify US universities by their logo? Play Guess the School with 50 top universities. Buy hints with Solana micropayments and compete for weekly prizes.',
  alternates: { canonical: 'https://x402muse.com/school' },
  openGraph: {
    title: 'Guess the School - Muse x402',
    description: 'Can you identify US universities by their logo? Compete for weekly SOL prizes.',
    url: 'https://x402muse.com/school',
  },
};

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  return children;
}
