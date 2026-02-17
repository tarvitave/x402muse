import {
  BaseMessageSignerWalletAdapter,
  WalletName,
  WalletReadyState,
  WalletNotConnectedError,
} from '@solana/wallet-adapter-base';
import { Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

export const MuseWalletName = 'Muse Wallet' as WalletName<'Muse Wallet'>;

export class MuseWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = MuseWalletName;
  url = 'https://muse-x402.app';
  icon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjOEI1Q0Y2Ii8+PHRleHQgeD0iNTAlIiB5PSI1NSUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE4IiBmb250LWZhbWlseT0ic2VyaWYiPk08L3RleHQ+PC9zdmc+';
  supportedTransactionVersions = null as never;

  private _connecting = false;
  private _publicKey: PublicKey | null = null;
  private _keypair: Keypair | null = null;
  private _connectResolve: (() => void) | null = null;
  private _connectReject: ((err: Error) => void) | null = null;

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get readyState(): WalletReadyState {
    return WalletReadyState.Installed;
  }

  async autoConnect(): Promise<void> {
    return;
  }

  async connect(): Promise<void> {
    if (this._publicKey) return;

    this._connecting = true;

    return new Promise<void>((resolve, reject) => {
      this._connectResolve = resolve;
      this._connectReject = reject;
      window.dispatchEvent(new CustomEvent('muse-wallet-connect-request'));
    });
  }

  unlock(keypair: Keypair): void {
    this._keypair = keypair;
    this._publicKey = keypair.publicKey;
    this._connecting = false;
    this.emit('connect', this._publicKey);
    this._connectResolve?.();
    this._connectResolve = null;
    this._connectReject = null;
  }

  cancelConnect(): void {
    this._connecting = false;
    this._connectReject?.(new Error('User cancelled'));
    this._connectResolve = null;
    this._connectReject = null;
  }

  async disconnect(): Promise<void> {
    this._keypair = null;
    this._publicKey = null;
    this.emit('disconnect');
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    if (!this._keypair) throw new WalletNotConnectedError();
    if (transaction instanceof Transaction) {
      transaction.partialSign(this._keypair);
    }
    return transaction;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._keypair) throw new WalletNotConnectedError();
    const nacl = (await import('tweetnacl')).default;
    return nacl.sign.detached(message, this._keypair.secretKey);
  }
}
