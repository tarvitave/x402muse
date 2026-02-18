export type GameMode = 'painting' | 'school';

export interface Painting {
  id: string;
  imageUrl: string;
  blurLevel: string;
  artist: string;
  title: string;
  answer: string;
  category?: GameMode;
  hints: Hint[];
}

export interface Hint {
  id: string;
  type?: string;
  label: string;
  content: string;
  costSol: number;
  isLocked: boolean;
}
