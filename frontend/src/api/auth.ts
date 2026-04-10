import { iamClient } from './client';
import type { AuthTokens, User } from '../types';

export const authApi = {
  login: async (username: string, password: string): Promise<AuthTokens> => {
    const { data } = await iamClient.post('/token/', { username, password });
    return data;
  },

  refreshToken: async (refresh: string): Promise<{ access: string }> => {
    const { data } = await iamClient.post('/token/refresh/', { refresh });
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await iamClient.get('/users/me/');
    return data;
  },
};
