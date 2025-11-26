import type { Album } from '@soundx/db';
import type { ILoadMoreData } from '../models';

// Mock data generator
const generateMockAlbums = (page: number, pageSize: number = 8): Album[] => {
  const albums: Album[] = [];
  const startId = page * pageSize;

  for (let i = 0; i < pageSize; i++) {
    const id = startId + i + 1;
    albums.push({
      id,
      name: `Album ${id}`,
      artist: `Artist ${id}`,
      cover: `https://picsum.photos/seed/album${id}/300/300`,
      year: '2023',
    });
  }

  return albums;
};

// Mock API: Get recommended albums (load more style)
export const loadMoreRecommended = async (
  page: number = 0,
  pageSize: number = 8
): Promise<ILoadMoreData<Album>> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const list = generateMockAlbums(page, pageSize);
  const total = 50; // Mock total count

  return {
    list,
    pageSize,
    loadCount: page,
    hasMore: (page + 1) * pageSize < total,
    total,
  };
};

// Mock API: Get recommended sections (for homepage sections)
export const getRecommendedSections = async (): Promise<{
  id: string;
  title: string;
  items: Album[];
}[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  return [
    {
      id: '1',
      title: 'New Releases',
      items: generateMockAlbums(0, 8),
    },
    {
      id: '2',
      title: 'Top Charts',
      items: generateMockAlbums(1, 8),
    },
  ];
};
