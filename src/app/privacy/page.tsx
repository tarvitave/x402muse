import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - Muse x402',
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm mb-6 inline-block">&larr; Back to Game</Link>
      <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
      <p className="text-gray-400 text-sm mb-8">Last updated: February 22, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300">
        <section>
          <h2 className="text-xl font-semibold text-white">1. Introduction</h2>
          <p>
            Muse x402 (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;) operates the website x402muse.com. This Privacy Policy explains how we collect, use, and protect information when you use our Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">2. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Wallet Address:</strong> Your Solana wallet public key, used as your account identifier when you connect your wallet.</li>
            <li><strong>Profile Information:</strong> Display name and optional email address that you voluntarily provide.</li>
            <li><strong>Game Data:</strong> Scores, guesses, hints purchased, and gameplay statistics.</li>
            <li><strong>Transaction Data:</strong> Solana transaction signatures related to hint purchases and payouts.</li>
          </ul>
          <p>We do not collect passwords, private keys, seed phrases, or any secret wallet credentials.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide and operate the trivia game experience.</li>
            <li>To display your name on public leaderboards.</li>
            <li>To process Solana micropayments for hints via the x402 protocol.</li>
            <li>To distribute weekly prize payouts to top-scoring players.</li>
            <li>To improve and maintain the Service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">4. Blockchain Transactions</h2>
          <p>
            Hint purchases and prize payouts are processed on the Solana blockchain. Blockchain transactions are publicly visible and irreversible by nature. We do not control the Solana network and cannot modify or delete on-chain transaction records.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">5. Data Storage and Security</h2>
          <p>
            Your data is stored on our servers. We use reasonable security measures to protect your information. However, no method of transmission over the Internet or electronic storage is completely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">6. Third-Party Services</h2>
          <p>
            The Service interacts with third-party services including Solana RPC providers for blockchain transactions and museum APIs (Art Institute of Chicago, Metropolitan Museum of Art, Rijksmuseum) for painting data. These services have their own privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">7. Cookies</h2>
          <p>
            We do not use tracking cookies or third-party analytics. Wallet connection state is managed client-side by your browser wallet extension.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">8. Children</h2>
          <p>
            The Service is not intended for users under the age of 18. We do not knowingly collect personal information from children.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">10. Contact</h2>
          <p>
            If you have questions about this Privacy Policy, please visit <a href="https://x402info.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">x402info.com</a> for contact information.
          </p>
        </section>
      </div>
    </main>
  );
}
