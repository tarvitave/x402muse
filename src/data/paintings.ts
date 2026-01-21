import { Painting } from "@/lib/types";

export const paintings: Painting[] = [
  {
    id: '1',
    // Starry Night - Public Domain
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    blurLevel: 'blur(10px)',
    artist: 'Vincent van Gogh',
    title: 'The Starry Night',
    hints: [
      {
        id: '1-1',
        type: 'location',
        label: 'Where is it displayed?',
        content: 'The Museum of Modern Art, New York',
        costSol: 0.01,
        isLocked: true,
      },
      {
        id: '1-2',
        type: 'bio',
        label: 'Artist\'s Nationality?',
        content: 'Dutch',
        costSol: 0.01,
        isLocked: true,
      },
      {
        id: '1-3',
        type: 'context',
        label: 'When was it painted?',
        content: '1889',
        costSol: 0.01,
        isLocked: true,
      },
    ],
  },
  {
    id: '2',
    // Mona Lisa - Public Domain
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
    blurLevel: 'blur(10px)',
    artist: 'Leonardo da Vinci',
    title: 'Mona Lisa',
    hints: [
      {
        id: '2-1',
        type: 'location',
        label: 'Where is it displayed?',
        content: 'The Louvre, Paris',
        costSol: 0.01,
        isLocked: true,
      },
      {
        id: '2-2',
        type: 'context',
        label: 'What is the medium?',
        content: 'Oil on poplar panel',
        costSol: 0.01,
        isLocked: true,
      },
    ],
  },
];
