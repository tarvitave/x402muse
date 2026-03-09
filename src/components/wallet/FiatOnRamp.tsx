'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { PublicKey } from '@solana/web3.js';
import { useWalletUIStore } from '@/lib/wallet/walletStore';

interface FiatOnRampProps {
  publicKey: PublicKey;
}

export default function FiatOnRamp({ publicKey }: FiatOnRampProps) {
  const { setView } = useWalletUIStore();
  const walletAddress = publicKey.toBase58();

  const [status, setStatus] = useState<'loading' | 'pending_approval' | 'not_configured' | 'error' | 'ready'>('loading');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [stripeJsLoaded, setStripeJsLoaded] = useState(false);
  const [onrampScriptLoaded, setOnrampScriptLoaded] = useState(false);
  const widgetMounted = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/stripe-onramp-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        });
        const data = await res.json();
        if (data.error === 'not_configured') {
          setStatus('not_configured');
        } else if (data.error === 'pending_approval') {
          setStatus('pending_approval');
        } else if (data.client_secret) {
          setClientSecret(data.client_secret);
          setStatus('ready');
        } else {
          setErrorMsg(data.error || 'Unknown error from Stripe');
          setStatus('error');
        }
      } catch (err) {
        setErrorMsg(String(err));
        setStatus('error');
      }
    })();
  }, [walletAddress]);

  useEffect(() => {
    if (!stripeJsLoaded || !onrampScriptLoaded || !clientSecret || widgetMounted.current) return;
    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) return;
    try {
      // @ts-expect-error — StripeOnramp is injected by the Stripe script tag
      const onramp = StripeOnramp(stripeKey);
      const session = onramp.createSession({ clientSecret });
      session.mount('#stripe-onramp-element');
      widgetMounted.current = true;
    } catch (err) {
      console.error('Stripe widget mount error:', err);
      setErrorMsg(String(err));
      setStatus('error');
    }
  }, [stripeJsLoaded, onrampScriptLoaded, clientSecret]);

  return (
    <div className="space-y-4">
      {/* Load Stripe scripts immediately so they're ready when the session arrives */}
      <Script src="https://js.stripe.com/v3/" onLoad={() => setStripeJsLoaded(true)} />
      <Script src="https://crypto-js.stripe.com/crypto-onramp-outer.js" onLoad={() => setOnrampScriptLoaded(true)} />

      <button
        onClick={() => setView('dashboard')}
        className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
      >
        ← Back to wallet
      </button>

      {status === 'loading' && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {status === 'not_configured' && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center space-y-3">
          <p className="text-yellow-400 text-sm font-semibold">Stripe not configured</p>
          <p className="text-gray-400 text-xs">Add the following to your GitHub secrets and deploy:</p>
          <div className="space-y-1">
            {['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'].map((v) => (
              <code key={v} className="block text-xs bg-gray-800 text-purple-300 rounded px-2 py-1">{v}</code>
            ))}
          </div>
        </div>
      )}

      {status === 'pending_approval' && (
        <div className="bg-gray-900 border border-yellow-600/40 rounded-lg p-5 text-center space-y-3">
          <p className="text-2xl">⏳</p>
          <p className="text-yellow-400 font-semibold">Stripe Crypto Onramp — Pending Approval</p>
          <p className="text-gray-400 text-sm">
            Your Stripe account needs to be approved for the Crypto Onramp feature before purchases can go live.
          </p>
          <ol className="text-left text-sm text-gray-300 space-y-1 list-decimal list-inside">
            <li>Go to <span className="text-purple-400">Stripe Dashboard → Products → Crypto Onramp</span></li>
            <li>Submit the onramp application</li>
            <li>Wait for approval (~48 hours)</li>
          </ol>
          <p className="text-gray-500 text-xs">Once approved, this widget will activate automatically — no code changes needed.</p>
        </div>
      )}

      {status === 'error' && (
        <p className="text-red-400 text-sm">Error: {errorMsg}</p>
      )}

      {status === 'ready' && (
        <div id="stripe-onramp-element" className="min-h-[500px]" />
      )}
    </div>
  );
}
