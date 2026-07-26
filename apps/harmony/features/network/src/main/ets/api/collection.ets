import { httpClient } from '../HarmonyHttpClient';

export interface CollectionDto {
  id: string; name: string; coverUrl?: string; description?: string;
}

export interface CollectionDetailResp extends CollectionDto { audiobooks?: unknown[] }

export const collectionApi = {
  async list(): Promise<CollectionDto[]> {
    return httpClient.get<CollectionDto[]>('/audiobook-collection');
  },
  async getById(id: string): Promise<CollectionDetailResp> {
    return httpClient.get<CollectionDetailResp>(`/audiobook-collection/${id}`);
  },
  async create(name: string): Promise<CollectionDto> {
    return httpClient.post<CollectionDto>('/audiobook-collection', { name });
  },
  async rename(id: string, name: string): Promise<CollectionDto> {
    return httpClient.put<CollectionDto>(`/audiobook-collection/${id}`, { name });
  },
  async remove(id: string): Promise<void> {
    return httpClient.del<void>(`/audiobook-collection/${id}`);
  },
  async reorder(id: string, orderedIds: string[]): Promise<void> {
    return httpClient.post<void>(`/audiobook-collection/${id}/reorder`, { orderedIds });
  },
};
