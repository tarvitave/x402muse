import Link from 'next/link';

export const metadata = {
  title: 'How We Built Muse x402 with Claude Code, GitHub & Digital Ocean | Blog',
  description:
    'A full walkthrough of how Muse x402 was built inside VSCode using Claude Code, committed to GitHub, and automatically deployed to Digital Ocean — with nocodeapi.com and osvue.com for monitoring.',
  alternates: { canonical: 'https://x402muse.com/blog/how-we-built-muse-x402' },
  openGraph: {
    title: 'How We Built Muse x402 with Claude Code, GitHub & Digital Ocean',
    description: 'AI-assisted development, GitHub Actions CI/CD, and real-time monitoring — the full story.',
    type: 'article',
    publishedTime: '2026-03-06',
  },
};

function DevDeployDiagram() {
  return (
    <figure className="my-10">
      <figcaption className="text-sm text-gray-400 mb-4 text-center font-medium uppercase tracking-wide">
        Development → Deployment Pipeline
      </figcaption>
      <svg
        viewBox="0 0 760 200"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-2xl mx-auto block"
        role="img"
        aria-label="Flow diagram: VSCode and Claude Code commit to GitHub, GitHub Actions builds and deploys to Digital Ocean, which serves x402muse.com"
      >
        {/* ── Box 1: VSCode + Claude Code ── */}
        <rect x="10" y="60" width="140" height="80" rx="10" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="1.5"/>
        <text x="80" y="90" textAnchor="middle" fill="#e9d5ff" fontSize="11" fontWeight="bold">VSCode</text>
        <text x="80" y="106" textAnchor="middle" fill="#c4b5fd" fontSize="10">+ Claude Code</text>
        <text x="80" y="122" textAnchor="middle" fill="#9ca3af" fontSize="9">AI pair programming</text>

        {/* Arrow 1 */}
        <line x1="152" y1="100" x2="188" y2="100" stroke="#7c3aed" strokeWidth="1.5" markerEnd="url(#arrow)"/>
        <text x="170" y="93" textAnchor="middle" fill="#6b7280" fontSize="8">git push</text>

        {/* ── Box 2: GitHub ── */}
        <rect x="190" y="60" width="130" height="80" rx="10" fill="#161b22" stroke="#30363d" strokeWidth="1.5"/>
        <text x="255" y="90" textAnchor="middle" fill="#f0f6fc" fontSize="11" fontWeight="bold">GitHub</text>
        <text x="255" y="106" textAnchor="middle" fill="#8b949e" fontSize="10">tarvitave/x402muse</text>
        <text x="255" y="122" textAnchor="middle" fill="#8b949e" fontSize="9">main branch</text>

        {/* Arrow 2 */}
        <line x1="322" y1="100" x2="358" y2="100" stroke="#238636" strokeWidth="1.5" markerEnd="url(#arrow2)"/>
        <text x="340" y="93" textAnchor="middle" fill="#6b7280" fontSize="8">Actions CI/CD</text>

        {/* ── Box 3: GitHub Actions ── */}
        <rect x="360" y="60" width="130" height="80" rx="10" fill="#0d1117" stroke="#238636" strokeWidth="1.5"/>
        <text x="425" y="88" textAnchor="middle" fill="#3fb950" fontSize="11" fontWeight="bold">GitHub Actions</text>
        <text x="425" y="104" textAnchor="middle" fill="#8b949e" fontSize="9">npm install &amp; build</text>
        <text x="425" y="118" textAnchor="middle" fill="#8b949e" fontSize="9">docker push</text>

        {/* Arrow 3 */}
        <line x1="492" y1="100" x2="528" y2="100" stroke="#0080ff" strokeWidth="1.5" markerEnd="url(#arrow3)"/>
        <text x="510" y="93" textAnchor="middle" fill="#6b7280" fontSize="8">deploy</text>

        {/* ── Box 4: Digital Ocean ── */}
        <rect x="530" y="60" width="130" height="80" rx="10" fill="#0a2540" stroke="#0080ff" strokeWidth="1.5"/>
        <text x="595" y="88" textAnchor="middle" fill="#4db8ff" fontSize="11" fontWeight="bold">Digital Ocean</text>
        <text x="595" y="104" textAnchor="middle" fill="#8ab4cc" fontSize="9">App Platform</text>
        <text x="595" y="120" textAnchor="middle" fill="#e2f0fb" fontSize="10" fontWeight="bold">x402muse.com</text>

        {/* Arrow markers */}
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#7c3aed"/>
          </marker>
          <marker id="arrow2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#238636"/>
          </marker>
          <marker id="arrow3" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#0080ff"/>
          </marker>
        </defs>
      </svg>
    </figure>
  );
}

function MonitoringDiagram() {
  return (
    <figure className="my-10">
      <figcaption className="text-sm text-gray-400 mb-4 text-center font-medium uppercase tracking-wide">
        Monitoring &amp; Observability Stack
      </figcaption>
      <svg
        viewBox="0 0 640 180"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-xl mx-auto block"
        role="img"
        aria-label="Monitoring diagram: x402muse.com is monitored by osvue.com for uptime and nocodeapi.com for API health"
      >
        {/* ── Centre: Live site ── */}
        <rect x="240" y="50" width="160" height="80" rx="10" fill="#0a2540" stroke="#0080ff" strokeWidth="1.5"/>
        <text x="320" y="82" textAnchor="middle" fill="#4db8ff" fontSize="12" fontWeight="bold">x402muse.com</text>
        <text x="320" y="100" textAnchor="middle" fill="#8ab4cc" fontSize="10">Digital Ocean</text>
        <text x="320" y="115" textAnchor="middle" fill="#8ab4cc" fontSize="9">Next.js · SQLite · Node</text>

        {/* ── Left: osvue.com ── */}
        <rect x="30" y="55" width="150" height="70" rx="10" fill="#1a1a2e" stroke="#f59e0b" strokeWidth="1.5"/>
        <text x="105" y="82" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">osvue.com</text>
        <text x="105" y="98" textAnchor="middle" fill="#9ca3af" fontSize="10">Uptime monitoring</text>
        <text x="105" y="113" textAnchor="middle" fill="#9ca3af" fontSize="9">performance metrics</text>

        {/* Arrow left ↔ centre */}
        <line x1="182" y1="90" x2="238" y2="90" stroke="#f59e0b" strokeWidth="1.2" markerEnd="url(#arrowY)" markerStart="url(#arrowYR)"/>

        {/* ── Right: nocodeapi.com ── */}
        <rect x="460" y="55" width="150" height="70" rx="10" fill="#1a1a2e" stroke="#10b981" strokeWidth="1.5"/>
        <text x="535" y="80" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">nocodeapi.com</text>
        <text x="535" y="96" textAnchor="middle" fill="#9ca3af" fontSize="10">API health checks</text>
        <text x="535" y="111" textAnchor="middle" fill="#9ca3af" fontSize="9">endpoint monitoring</text>

        {/* Arrow centre ↔ right */}
        <line x1="402" y1="90" x2="458" y2="90" stroke="#10b981" strokeWidth="1.2" markerEnd="url(#arrowG)" markerStart="url(#arrowGR)"/>

        <defs>
          <marker id="arrowY" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/>
          </marker>
          <marker id="arrowYR" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b"/>
          </marker>
          <marker id="arrowG" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#10b981"/>
          </marker>
          <marker id="arrowGR" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 Z" fill="#10b981"/>
          </marker>
        </defs>
      </svg>
    </figure>
  );
}

export default function BlogPost() {
  return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-10">
      <Link href="/blog" className="text-purple-400 hover:text-purple-300 text-sm mb-6 inline-block">
        &larr; Back to Blog
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {['Claude Code', 'GitHub Actions', 'Digital Ocean', 'Next.js', 'Solana'].map((tag) => (
            <span key={tag} className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-3">
          How We Built Muse x402 with Claude Code, GitHub &amp; Digital Ocean
        </h1>
        <p className="text-gray-400 text-sm">March 6, 2026 · 8 min read</p>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300">

        {/* Intro */}
        <section>
          <p className="text-lg text-gray-200 leading-relaxed">
            Muse x402 is a web3 trivia game where players guess famous paintings and university mascots,
            paying tiny Solana micropayments to unlock hints. The entire project — from first commit to
            live deployment — was built using <strong className="text-white">Claude Code inside VSCode</strong>,
            with every push automatically deployed to <strong className="text-white">Digital Ocean</strong> via
            GitHub Actions. Here&apos;s how it all fits together.
          </p>
        </section>

        {/* The Stack */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">The Tech Stack</h2>
          <p>
            Before diving into the workflow, here&apos;s what Muse x402 is built on:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-3">
            <li><strong className="text-white">Next.js 15</strong> — React framework handling both the frontend and API routes</li>
            <li><strong className="text-white">Prisma + SQLite</strong> — database ORM with a lightweight SQLite file on the server</li>
            <li><strong className="text-white">Solana Web3.js</strong> — for wallet connections and on-chain micropayments</li>
            <li><strong className="text-white">Tailwind CSS</strong> — utility-first styling, dark theme throughout</li>
            <li><strong className="text-white">x402 Payment Protocol</strong> — HTTP 402 Payment Required flow for hint unlocking</li>
          </ul>
        </section>

        {/* Claude Code section */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Writing Code with Claude Code</h2>
          <p>
            Almost every file in this project was written, edited, or reviewed inside{' '}
            <strong className="text-white">VSCode</strong> using the{' '}
            <strong className="text-white">Claude Code extension</strong> — Anthropic&apos;s official AI coding
            assistant. Claude Code runs directly in the terminal as a CLI and integrates natively with the
            VSCode editor, giving it full visibility into the entire codebase at once.
          </p>
          <p className="mt-3">
            The workflow looked like this: describe a feature in plain English, let Claude Code read the
            relevant files, propose changes, and apply edits. For example, the entire x402 payment flow —
            the 402 response from the API, the Solana transaction in the frontend, the on-chain
            verification — was scaffolded and debugged this way.
          </p>
          <p className="mt-3">
            What made it especially powerful was Claude Code&apos;s ability to hold the full context of the
            project — it understood how{' '}
            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-purple-300 text-xs">HintCard.tsx</code> talked
            to the hints API, which talked to Prisma, which talked to the database — without needing everything
            re-explained each time. Complex multi-file changes that would have taken hours were done in minutes.
          </p>
        </section>

        {/* Git workflow */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">From VSCode to GitHub</h2>
          <p>
            Once a feature was working locally, committing it was a one-line command. Claude Code would often
            draft the commit message too — summarising exactly what changed and why. Commits were pushed
            directly to the <code className="bg-gray-800 px-1.5 py-0.5 rounded text-purple-300 text-xs">main</code> branch
            on the <strong className="text-white">GitHub repository</strong>{' '}
            (<code className="bg-gray-800 px-1.5 py-0.5 rounded text-purple-300 text-xs">tarvitave/x402muse</code>).
          </p>
          <p className="mt-3">
            The repository acts as the single source of truth. Pull requests were used for larger features,
            while small fixes and content updates went straight to main. The branch protection rules and
            automated checks kept the main branch always in a deployable state.
          </p>
        </section>

        {/* CI/CD Diagram */}
        <DevDeployDiagram />

        {/* GitHub Actions */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">GitHub Actions → Digital Ocean</h2>
          <p>
            Every push to <code className="bg-gray-800 px-1.5 py-0.5 rounded text-purple-300 text-xs">main</code> triggers
            a <strong className="text-white">GitHub Actions</strong> workflow automatically. The workflow:
          </p>
          <ol className="list-decimal pl-6 space-y-2 mt-3">
            <li>Checks out the repository</li>
            <li>Installs dependencies with <code className="bg-gray-800 px-1.5 py-0.5 rounded text-purple-300 text-xs">npm install</code></li>
            <li>Runs the Next.js production build</li>
            <li>Builds a Docker image and pushes it to the container registry</li>
            <li>Triggers a re-deploy on <strong className="text-white">Digital Ocean App Platform</strong></li>
          </ol>
          <p className="mt-4">
            Digital Ocean&apos;s App Platform handles the heavy lifting from there — spinning up the new
            container, running health checks, and switching traffic over with zero downtime. The database
            (a SQLite file on a persistent volume) is preserved across deploys.
          </p>
          <p className="mt-3">
            The whole pipeline — from <code className="bg-gray-800 px-1.5 py-0.5 rounded text-purple-300 text-xs">git push</code> to
            live on the internet — takes about 90 seconds. Fast enough that we&apos;d push a tweak, refresh the
            browser, and it was there.
          </p>
        </section>

        {/* Monitoring */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Keeping the Lights On: Monitoring</h2>
          <p>
            A game with live Solana payments needs reliable uptime monitoring. Two tools keep tabs on Muse x402:
          </p>

          <MonitoringDiagram />

          <h3 className="text-lg font-semibold text-white mt-4 mb-2">
            <a href="https://osvue.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300">
              osvue.com
            </a>
            {' '}— Uptime &amp; Performance
          </h3>
          <p>
            Osvue monitors <strong className="text-white">x402muse.com</strong> from multiple regions, alerting
            immediately if the site goes down or response times spike. It also tracks historical uptime and
            gives a public-facing status page. For a payment-enabled game where players expect instant
            responses, even a 30-second outage needs to be caught fast.
          </p>

          <h3 className="text-lg font-semibold text-white mt-5 mb-2">
            <a href="https://nocodeapi.com" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
              nocodeapi.com
            </a>
            {' '}— API Health
          </h3>
          <p>
            Nocodeapi monitors the individual API endpoints —{' '}
            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-purple-300 text-xs">/api/paintings</code>,{' '}
            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-purple-300 text-xs">/api/schools</code>,{' '}
            <code className="bg-gray-800 px-1.5 py-0.5 rounded text-purple-300 text-xs">/api/hints/[id]</code> — making
            sure each one is returning the right status codes and response times. It catches issues like a slow
            database query or a broken external image URL before players notice.
          </p>
        </section>

        {/* What Claude Code changed */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">What AI-Assisted Development Actually Feels Like</h2>
          <p>
            The honest answer: it feels like having a senior developer available at any time who has read
            every file in the codebase. You describe what you want, it proposes a solution and explains the
            trade-offs. You can accept, modify, or push back. The iteration speed is genuinely different from
            writing everything by hand.
          </p>
          <p className="mt-3">
            It&apos;s not magic. Claude Code still makes mistakes — it occasionally proposes changes that break
            something else, or misunderstands a subtle requirement. But those are caught quickly because the
            feedback loop is fast: change, run locally, see the result in seconds, ask Claude to fix it.
          </p>
          <p className="mt-3">
            For a project like Muse x402 — spanning Solana wallet integration, a custom payment protocol,
            database persistence, admin tooling, and a leaderboard — being able to move across all of it
            without context-switching cost was a big deal.
          </p>
        </section>

        {/* Conclusion */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Wrapping Up</h2>
          <p>
            The full stack — VSCode + Claude Code for development, GitHub for version control, GitHub Actions
            for CI/CD, Digital Ocean for hosting, osvue.com for uptime monitoring, and nocodeapi.com for
            API health — gave a small team the ability to ship, iterate, and monitor a production-grade web3
            app quickly and confidently.
          </p>
          <p className="mt-3">
            If you want to try the game, head to{' '}
            <Link href="/" className="text-purple-400 hover:text-purple-300">
              x402muse.com
            </Link>
            . Connect a Solana wallet, guess a painting or a school logo, and see the x402 payment flow
            in action.
          </p>
        </section>

      </div>

      {/* Footer nav */}
      <div className="mt-12 pt-6 border-t border-gray-800">
        <Link href="/blog" className="text-purple-400 hover:text-purple-300 text-sm">
          &larr; All posts
        </Link>
      </div>
    </main>
  );
}
