import { iamClient } from './client';
import type { User } from '../types';

interface PaginatedUsers {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

interface CreateUserData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  user_type: string;
}

export const usersApi = {
  list: (page = 1, search = '') =>
    iamClient.get<PaginatedUsers>('/users/', {
      params: { page, ...(search ? { search } : {}) },
    }).then(r => r.data),

  listByType: (user_type?: string) =>
    iamClient.get<User[]>('/users/by-type/', { params: user_type ? { user_type } : {} })
      .then(r => r.data),

  lawyers: () =>
    iamClient.get<User[]>('/users/by-type/', { params: { user_type: 'lawyer' } })
      .then(r => r.data),

  clients: () =>
    iamClient.get<User[]>('/users/by-type/', { params: { user_type: 'client' } })
      .then(r => r.data),

  create: (data: CreateUserData) =>
    iamClient.post<User>('/users/', data).then(r => r.data),

  delete: (id: string) =>
    iamClient.delete(`/users/${id}/`).then(r => r.data),
};
