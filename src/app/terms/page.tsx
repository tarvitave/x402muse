import Link from 'next/link';

export const metadata = {
  title: 'Terms of Use - Muse x402',
};

export default function TermsOfUse() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm mb-6 inline-block">&larr; Back to Game</Link>
      <h1 className="text-3xl font-bold text-white mb-6">Terms of Use</h1>
      <p className="text-gray-400 text-sm mb-8">Last updated: February 22, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300">
        <section>
          <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Muse x402 at x402muse.com (&quot;the Service&quot;), you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">2. Description of Service</h2>
          <p>
            Muse x402 is a trivia game that demonstrates the x402 Payment Protocol using Solana blockchain micropayments. Users guess paintings and schools, can purchase hints using SOL, and compete on weekly leaderboards for prize payouts.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">3. Eligibility</h2>
          <p>
            You must be at least 18 years of age to use this Service. By using the Service, you represent that you are at least 18 years old and have the legal capacity to enter into these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">4. Wallet Connection</h2>
          <p>
            The Service requires a Solana-compatible wallet for certain features including hint purchases and leaderboard participation. You are solely responsible for the security of your wallet and private keys. We never request or store your private keys or seed phrases.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">5. Payments and Transactions</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Hint purchases are processed as Solana blockchain transactions using the x402 protocol.</li>
            <li>All blockchain transactions are final and irreversible.</li>
            <li>Transaction amounts are displayed before confirmation. You are responsible for reviewing and approving each transaction.</li>
            <li>We are not responsible for failed transactions, network fees, or losses due to blockchain network issues.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">6. Weekly Prizes</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Weekly prize pools are funded by SOL collected from hint purchases during that week.</li>
            <li>The top-scoring player each week receives the prize pool payout.</li>
            <li>Payouts are sent to the winner&apos;s registered wallet address via Solana transfer.</li>
            <li>We reserve the right to modify prize structures, payout schedules, or scoring rules at any time.</li>
            <li>If no SOL is collected during a week, no prize is paid out.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">7. Fair Play</h2>
          <p>
            You agree not to use bots, scripts, or automated tools to play the game or manipulate scores. We reserve the right to disqualify users and void scores if we detect unfair play or abuse.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">8. Intellectual Property</h2>
          <p>
            Painting images are sourced from public-domain museum collections (Art Institute of Chicago, Metropolitan Museum of Art, Rijksmuseum). School logos and images are used under fair use for educational purposes. The Muse x402 platform, code, and design are proprietary.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">9. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or secure. We are not responsible for any losses resulting from use of the Service, including but not limited to loss of SOL or other digital assets.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Muse x402 and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including loss of funds, data, or profits.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">11. Modifications</h2>
          <p>
            We reserve the right to modify these Terms of Use at any time. Changes will be posted on this page. Your continued use of the Service after modifications constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">12. Termination</h2>
          <p>
            We reserve the right to suspend or terminate access to the Service at any time, for any reason, without notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">13. Contact</h2>
          <p>
            For questions about these Terms of Use, please visit <a href="https://x402info.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">x402info.com</a> for contact information.
          </p>
        </section>
      </div>
    </main>
  );
}
