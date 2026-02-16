import { create } from 'zustand';
import type { WalletModalView } from './types';

interface WalletUIState {
  isModalOpen: boolean;
  modalView: WalletModalView;
  mnemonic: string | null;
  openModal: (view?: WalletModalView) => void;
  closeModal: () => void;
  setView: (view: WalletModalView) => void;
  setMnemonic: (mnemonic: string | null) => void;
}

export const useWalletUIStore = create<WalletUIState>((set) => ({
  isModalOpen: false,
  modalView: 'choose',
  mnemonic: null,
  openModal: (view) => set({ isModalOpen: true, modalView: view ?? 'choose' }),
  closeModal: () => set({ isModalOpen: false, mnemonic: null }),
  setView: (view) => set({ modalView: view }),
  setMnemonic: (mnemonic) => set({ mnemonic }),
}));
