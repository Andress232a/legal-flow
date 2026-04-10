import { docClient } from './client';
import type { Document, DocumentVersion, PaginatedResponse } from '../types';

export const documentsApi = {
  list: async (page = 1, search = ''): Promise<PaginatedResponse<Document>> => {
    const params: Record<string, string | number> = { page };
    if (search) params.search = search;
    const { data } = await docClient.get('/documents/', { params });
    return data;
  },

  get: async (id: string): Promise<Document & { versions: DocumentVersion[] }> => {
    const { data } = await docClient.get(`/documents/${id}/`);
    return data;
  },

  upload: async (formData: FormData): Promise<Document> => {
    const { data } = await docClient.post('/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  download: async (id: string): Promise<Blob> => {
    const { data } = await docClient.get(`/documents/${id}/download/`, {
      responseType: 'blob',
    });
    return data;
  },

  getVersions: async (id: string): Promise<DocumentVersion[]> => {
    const { data } = await docClient.get(`/documents/${id}/versions/`);
    return data;
  },

  uploadNewVersion: async (id: string, formData: FormData): Promise<DocumentVersion> => {
    const { data } = await docClient.post(`/documents/${id}/new-version/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  downloadVersion: async (id: string, versionNumber: number): Promise<Blob> => {
    const { data } = await docClient.get(`/documents/${id}/versions/${versionNumber}/download/`, {
      responseType: 'blob',
    });
    return data;
  },
};
