import { analyticsClient } from './client';

export interface KpisResponse {
  cases: number | null;
  documents: number | null;
  time_entries: number | null;
  invoices: number | null;
  calendar_events: number | null;
}

export const analyticsApi = {
  kpis: async (): Promise<KpisResponse> => {
    const { data } = await analyticsClient.get('/kpis/');
    return data;
  },
};
