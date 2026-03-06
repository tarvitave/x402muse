import Link from 'next/link';

export const metadata = {
  title: 'Blog | Muse x402',
  description: 'Articles and behind-the-scenes posts about building Muse x402 — AI-assisted development, Solana payments, and the x402 protocol.',
  alternates: { canonical: 'https://x402muse.com/blog' },
};

const posts = [
  {
    slug: 'how-we-built-muse-x402',
    title: 'How We Built Muse x402 with Claude Code, GitHub & Digital Ocean',
    date: 'March 6, 2026',
    description:
      'A full walkthrough of how Muse x402 was built entirely inside VSCode using Claude Code, committed to GitHub, and automatically deployed to Digital Ocean — plus the monitoring tools keeping it healthy.',
    tags: ['Claude Code', 'GitHub Actions', 'Digital Ocean', 'Next.js'],
  },
];

export default function BlogIndex() {
  return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-10">
      <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm mb-6 inline-block">
        &larr; Back to Game
      </Link>

      <h1 className="text-4xl font-bold text-white mb-2">Blog</h1>
      <p className="text-gray-400 mb-10">Behind the scenes of building Muse x402.</p>

      <div className="space-y-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-colors group"
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors mb-2">
              {post.title}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">{post.description}</p>
            <p className="text-gray-500 text-xs">{post.date}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
