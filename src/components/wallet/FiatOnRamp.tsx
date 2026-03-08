'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { PublicKey } from '@solana/web3.js';
import { useWalletUIStore } from '@/lib/wallet/walletStore';

interface FiatOnRampProps {
  publicKey: PublicKey;
}

type Provider = 'stripe' | 'moonpay';

export default function FiatOnRamp({ publicKey }: FiatOnRampProps) {
  const { setView } = useWalletUIStore();
  const walletAddress = publicKey.toBase58();

  const [detecting, setDetecting] = useState(true);
  const [provider, setProvider] = useState<Provider>('moonpay');
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeScriptLoaded, setStripeScriptLoaded] = useState(false);
  const [moonpayUrl, setMoonpayUrl] = useState<string | null>(null);
  const [moonpayError, setMoonpayError] = useState<string | null>(null);
  const stripeWidgetMounted = useRef(false);

  // Step 1: detect region
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/detect-region');
        const { is_us } = await res.json();
        if (!cancelled) {
          setProvider(is_us ? 'stripe' : 'moonpay');
        }
      } catch {
        if (!cancelled) setProvider('moonpay'); // safe fallback
      } finally {
        if (!cancelled) setDetecting(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Step 2a: Stripe — fetch client_secret after region detected
  useEffect(() => {
    if (detecting || provider !== 'stripe') return;
    (async () => {
      try {
        const res = await fetch('/api/stripe-onramp-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        });
        const data = await res.json();
        if (data.error === 'not_configured') {
          setStripeError('not_configured');
        } else if (data.client_secret) {
          setStripeClientSecret(data.client_secret);
        } else {
          setStripeError(data.error || 'Unknown error');
        }
      } catch (err) {
        setStripeError(String(err));
      }
    })();
  }, [detecting, provider, walletAddress]);

  // Step 2b: MoonPay — build and sign URL after region detected
  useEffect(() => {
    if (detecting || provider !== 'moonpay') return;
    const moonpayKey = process.env.NEXT_PUBLIC_MOONPAY_KEY;
    if (!moonpayKey) {
      setMoonpayError('not_configured');
      return;
    }
    (async () => {
      try {
        const baseUrl = new URL('https://buy.moonpay.com');
        baseUrl.searchParams.set('apiKey', moonpayKey);
        baseUrl.searchParams.set('currencyCode', 'sol');
        baseUrl.searchParams.set('walletAddress', walletAddress);
        baseUrl.searchParams.set('colorCode', '%236d28d9'); // purple
        baseUrl.searchParams.set('language', 'en');

        const res = await fetch('/api/moonpay-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: baseUrl.toString() }),
        });
        const { signedUrl } = await res.json();
        setMoonpayUrl(signedUrl);
      } catch (err) {
        setMoonpayError(String(err));
      }
    })();
  }, [detecting, provider, walletAddress]);

  // Step 3: mount Stripe widget once script loaded and client_secret available
  useEffect(() => {
    if (!stripeScriptLoaded || !stripeClientSecret || stripeWidgetMounted.current) return;
    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) return;

    try {
      // @ts-expect-error — StripeOnramp is injected by the Stripe script tag
      const onramp = StripeOnramp(stripeKey);
      const session = onramp.createSession({ clientSecret: stripeClientSecret });
      session.mount('#stripe-onramp-element');
      stripeWidgetMounted.current = true;
    } catch (err) {
      console.error('Stripe widget mount error:', err);
      setStripeError(String(err));
    }
  }, [stripeScriptLoaded, stripeClientSecret]);

  if (detecting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Detecting your region...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setView('dashboard')}
        className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
      >
        ← Back to wallet
      </button>

      {provider === 'stripe' && (
        <>
          {stripeError === 'not_configured' ? (
            <NotConfigured provider="Stripe" envVars={['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY']} />
          ) : stripeError ? (
            <p className="text-red-400 text-sm">Error: {stripeError}</p>
          ) : (
            <>
              <Script
                src="https://crypto-js.stripe.com/crypto-onramp-outer.js"
                onLoad={() => setStripeScriptLoaded(true)}
              />
              {!stripeClientSecret ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div id="stripe-onramp-element" className="min-h-[500px]" />
              )}
            </>
          )}
        </>
      )}

      {provider === 'moonpay' && (
        <>
          {moonpayError === 'not_configured' ? (
            <NotConfigured provider="MoonPay" envVars={['NEXT_PUBLIC_MOONPAY_KEY', 'MOONPAY_SECRET_KEY']} />
          ) : moonpayError ? (
            <p className="text-red-400 text-sm">Error: {moonpayError}</p>
          ) : !moonpayUrl ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <iframe
              src={moonpayUrl}
              className="w-full rounded-lg border border-gray-700"
              style={{ height: '500px' }}
              allow="accelerometer; autoplay; camera; gyroscope; payment"
              title="MoonPay — Buy SOL"
            />
          )}
        </>
      )}
    </div>
  );
}

function NotConfigured({ provider, envVars }: { provider: string; envVars: string[] }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center space-y-3">
      <p className="text-yellow-400 text-sm font-semibold">{provider} not configured</p>
      <p className="text-gray-400 text-xs">
        Add the following to your GitHub secrets and deploy:
      </p>
      <div className="space-y-1">
        {envVars.map((v) => (
          <code key={v} className="block text-xs bg-gray-800 text-purple-300 rounded px-2 py-1">
            {v}
          </code>
        ))}
      </div>
    </div>
  );
}
