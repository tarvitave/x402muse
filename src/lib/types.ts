export interface Painting {
  id: string;
  imageUrl: string;
  blurLevel: string;
  artist: string;
  title: string;
  hints: Hint[];
}

export interface Hint {
  id: string;
  type: 'context' | 'location' | 'bio' | 'peers';
  label: string;
  content: string;
  costSol: number;
  isLocked: boolean;
}
