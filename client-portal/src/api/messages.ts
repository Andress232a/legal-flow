import { portalClient } from './client'
import type { PortalMessage } from '../types'

export const messagesApi = {
  list: async (): Promise<PortalMessage[]> => {
    const { data } = await portalClient.get('/messages/')
    if (Array.isArray(data)) return data
    return data.results ?? []
  },

  create: async (payload: {
    case_id: string
    recipient_id: string
    body: string
  }): Promise<PortalMessage> => {
    const { data } = await portalClient.post('/messages/', payload)
    return data
  },

  markRead: async (id: string): Promise<PortalMessage> => {
    const { data } = await portalClient.post(`/messages/${id}/mark-read/`)
    return data
  },
}
