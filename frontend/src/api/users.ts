import { iamClient } from './client';
import type { User, PaginatedResponse } from '../types';

export const usersApi = {
  list: async (page = 1, search = ''): Promise<PaginatedResponse<User>> => {
    const params: Record<string, string | number> = { page };
    if (search) params.search = search;
    const { data } = await iamClient.get('/users/', { params });
    return data;
  },

  get: async (id: string): Promise<User> => {
    const { data } = await iamClient.get(`/users/${id}/`);
    return data;
  },

  create: async (userData: Record<string, unknown>): Promise<User> => {
    const { data } = await iamClient.post('/users/', userData);
    return data;
  },

  update: async (id: string, userData: Record<string, unknown>): Promise<User> => {
    const { data } = await iamClient.patch(`/users/${id}/`, userData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await iamClient.delete(`/users/${id}/`);
  },

  assignRole: async (userId: string, roleId: string): Promise<void> => {
    await iamClient.post(`/users/${userId}/assign_role/`, { role: roleId });
  },
};
