import { iamClient } from './client';
import type { Role, RoleDetail, PaginatedResponse } from '../types';

export const rolesApi = {
  list: async (page = 1): Promise<PaginatedResponse<Role>> => {
    const { data } = await iamClient.get('/roles/', { params: { page } });
    return data;
  },

  get: async (id: string): Promise<RoleDetail> => {
    const { data } = await iamClient.get(`/roles/${id}/`);
    return data;
  },

  create: async (roleData: Record<string, unknown>): Promise<Role> => {
    const { data } = await iamClient.post('/roles/', roleData);
    return data;
  },

  update: async (id: string, roleData: Record<string, unknown>): Promise<Role> => {
    const { data } = await iamClient.patch(`/roles/${id}/`, roleData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await iamClient.delete(`/roles/${id}/`);
  },

  assignPermission: async (roleId: string, permissionId: string): Promise<void> => {
    await iamClient.post(`/roles/${roleId}/assign_permission/`, { permission: permissionId });
  },

  revokePermission: async (roleId: string, permissionId: string): Promise<void> => {
    await iamClient.post(`/roles/${roleId}/revoke-permission/`, { permission_id: permissionId });
  },
};
