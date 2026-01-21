'use client';

import './global-error.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div>
          <h1>Something went wrong!</h1>
          <p>{error.message || 'An unexpected error occurred.'}</p>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
