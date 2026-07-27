import { httpClient } from '../HarmonyHttpClient';

export interface CollectionDto {
  id: string; name: string; coverUrl?: string; description?: string;
}

export interface AudiobookItem {
  id: string;
  title: string;
}

export interface CollectionDetailResp extends CollectionDto { audiobooks?: AudiobookItem[] }

export interface CollectionCreatePayload {
  name: string;
}

export interface CollectionReorderPayload {
  orderedIds: string[];
}

export interface CollectionApi {
  list(): Promise<CollectionDto[]>;
  getById(id: string): Promise<CollectionDetailResp>;
  create(name: string): Promise<CollectionDto>;
  rename(id: string, name: string): Promise<CollectionDto>;
  remove(id: string): Promise<void>;
  reorder(id: string, orderedIds: string[]): Promise<void>;
}

class CollectionApiImpl implements CollectionApi {
  async list(): Promise<CollectionDto[]> {
    return httpClient.get<CollectionDto[]>('/audiobook-collection');
  }
  async getById(id: string): Promise<CollectionDetailResp> {
    return httpClient.get<CollectionDetailResp>(`/audiobook-collection/${id}`);
  }
  async create(name: string): Promise<CollectionDto> {
    const payload: CollectionCreatePayload = { name: name };
    return httpClient.post<CollectionDto>('/audiobook-collection', payload);
  }
  async rename(id: string, name: string): Promise<CollectionDto> {
    const payload: CollectionCreatePayload = { name: name };
    return httpClient.put<CollectionDto>(`/audiobook-collection/${id}`, payload);
  }
  async remove(id: string): Promise<void> {
    return httpClient.del<void>(`/audiobook-collection/${id}`);
  }
  async reorder(id: string, orderedIds: string[]): Promise<void> {
    const payload: CollectionReorderPayload = { orderedIds: orderedIds };
    return httpClient.post<void>(`/audiobook-collection/${id}/reorder`, payload);
  }
}

export const collectionApi: CollectionApi = new CollectionApiImpl();
