'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/admin/dashboard', label: 'Content' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/seo', label: 'SEO' },
  { href: '/admin/mailings', label: 'Mailings' },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 mb-8 border-b border-gray-700 pb-0">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-5 py-3 text-sm font-semibold transition-colors rounded-t-lg ${
            pathname === tab.href
              ? 'bg-gray-800 text-white border border-gray-700 border-b-gray-800 -mb-px'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
