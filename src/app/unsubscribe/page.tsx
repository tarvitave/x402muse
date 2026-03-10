'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UnsubscribeContent() {
  const params = useSearchParams();
  const success = params.get('success') === '1';
  const error = params.get('error');

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-xl p-8 text-center">
        {success ? (
          <>
            <div className="text-5xl mb-4">✓</div>
            <h1 className="text-xl font-bold text-white mb-2">You&apos;ve been unsubscribed</h1>
            <p className="text-gray-400 text-sm">
              You will no longer receive emails from this mailing list.
            </p>
          </>
        ) : error === 'invalid_token' ? (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-white mb-2">Link not found</h1>
            <p className="text-gray-400 text-sm">
              This unsubscribe link is invalid or has already been used.
            </p>
          </>
        ) : error === 'missing_token' ? (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-white mb-2">Invalid link</h1>
            <p className="text-gray-400 text-sm">
              The unsubscribe link is missing required information.
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-gray-400 text-sm">
              Unable to process your unsubscribe request. Please try again later.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}
