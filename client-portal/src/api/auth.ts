import { iamClient } from './client'
import type { User } from '../types'

export interface AuthTokens {
  access: string
  refresh: string
}

export const authApi = {
  login: async (username: string, password: string): Promise<AuthTokens> => {
    const { data } = await iamClient.post('/token/', { username, password })
    return data
  },

  getMe: async (): Promise<User> => {
    const { data } = await iamClient.get('/users/me/')
    return data
  },
}
