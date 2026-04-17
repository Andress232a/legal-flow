import { matterClient } from './client';
import type {
  Case,
  CaseParty,
  CaseDate,
  CaseActivityLog,
  CaseStats,
  PaginatedResponse,
} from '../types';

export const casesApi = {
  list: async (params?: {
    page?: number;
    search?: string;
    status?: string;
    case_type?: string;
    is_urgent?: boolean;
  }): Promise<PaginatedResponse<Case>> => {
    const { data } = await matterClient.get('/cases/', { params });
    return data;
  },

  get: async (id: string): Promise<Case> => {
    const { data } = await matterClient.get(`/cases/${id}/`);
    return data;
  },

  create: async (payload: {
    title: string;
    description?: string;
    case_type: string;
    status?: string;
    jurisdiction?: string;
    court?: string;
    assigned_lawyer_id: string;
    client_id: string;
    opened_at: string;
    is_urgent?: boolean;
    tags?: string[];
    notes?: string;
  }): Promise<Case> => {
    const { data } = await matterClient.post('/cases/', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    title: string;
    description: string;
    case_type: string;
    status: string;
    jurisdiction: string;
    court: string;
    assigned_lawyer_id: string;
    opened_at: string;
    closed_at: string;
    is_urgent: boolean;
    tags: string[];
    notes: string;
  }>): Promise<Case> => {
    const { data } = await matterClient.patch(`/cases/${id}/`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await matterClient.delete(`/cases/${id}/`);
  },

  changeStatus: async (id: string, status: string, notes?: string): Promise<Case> => {
    const { data } = await matterClient.post(`/cases/${id}/change-status/`, { status, notes });
    return data;
  },

  // Partes
  listParties: async (id: string): Promise<CaseParty[]> => {
    const { data } = await matterClient.get(`/cases/${id}/parties/`);
    return data;
  },

  addParty: async (id: string, party: {
    full_name: string;
    role: string;
    email?: string;
    phone?: string;
    identification?: string;
    address?: string;
    notes?: string;
    user_id?: string;
  }): Promise<CaseParty> => {
    const { data } = await matterClient.post(`/cases/${id}/add-party/`, party);
    return data;
  },

  removeParty: async (caseId: string, partyId: string): Promise<void> => {
    await matterClient.delete(`/cases/${caseId}/remove-party/${partyId}/`);
  },

  // Fechas
  listDates: async (id: string): Promise<CaseDate[]> => {
    const { data } = await matterClient.get(`/cases/${id}/dates/`);
    return data;
  },

  addDate: async (id: string, dateData: {
    title: string;
    date_type: string;
    scheduled_date: string;
    description?: string;
    is_critical?: boolean;
    notes?: string;
  }): Promise<CaseDate> => {
    const { data } = await matterClient.post(`/cases/${id}/add-date/`, dateData);
    return data;
  },

  completeDate: async (caseId: string, dateId: string): Promise<CaseDate> => {
    const { data } = await matterClient.post(`/cases/${caseId}/complete-date/${dateId}/`);
    return data;
  },

  // Auditoría
  activityLog: async (id: string): Promise<CaseActivityLog[]> => {
    const { data } = await matterClient.get(`/cases/${id}/activity-log/`);
    return data;
  },

  // Estadísticas
  stats: async (): Promise<CaseStats> => {
    const { data } = await matterClient.get('/cases/stats/');
    return data;
  },
};
