import { NextRequest, NextResponse } from 'next/server';

// Proxy Solana RPC calls through the server so the browser never hits
// the public mainnet endpoint directly (which returns 403 from browsers).
// The server uses the SOLANA_RPC_URL secret which may be a private endpoint.
export async function POST(req: NextRequest) {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

  const body = await req.text();

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const data = await response.text();
  return new NextResponse(data, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
