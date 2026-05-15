import { matterClient } from './client'
import type { CaseListItem } from '../types'

export const casesApi = {
  list: async (): Promise<{ results: CaseListItem[] }> => {
    const { data } = await matterClient.get('/cases/')
    return data
  },
}
