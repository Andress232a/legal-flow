import { iamClient } from './client';
import type { Permission, PaginatedResponse } from '../types';

export const permissionsApi = {
  list: async (page = 1, resourceType = ''): Promise<PaginatedResponse<Permission>> => {
    const params: Record<string, string | number> = { page };
    if (resourceType) params.resource_type = resourceType;
    const { data } = await iamClient.get('/permissions/', { params });
    return data;
  },

  create: async (permData: Record<string, unknown>): Promise<Permission> => {
    const { data } = await iamClient.post('/permissions/', permData);
    return data;
  },
};
