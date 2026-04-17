import { calendarClient } from './client';
import type { CalendarEvent, CalendarStats, EventReminder, PaginatedResponse } from '../types';

export const calendarApi = {
  list: async (params?: {
    page?: number;
    event_type?: string;
    priority?: string;
    case_id?: string;
    assigned_to?: string;
    is_completed?: boolean;
    is_legal_deadline?: boolean;
    date_from?: string;
    date_to?: string;
  }): Promise<PaginatedResponse<CalendarEvent>> => {
    const { data } = await calendarClient.get('/events/', { params });
    return data;
  },

  get: async (id: string): Promise<CalendarEvent> => {
    const { data } = await calendarClient.get(`/events/${id}/`);
    return data;
  },

  create: async (payload: {
    title: string;
    description?: string;
    event_type: string;
    priority?: string;
    start_datetime: string;
    end_datetime?: string;
    all_day?: boolean;
    location?: string;
    case_id?: string;
    case_number?: string;
    assigned_to?: string;
    is_legal_deadline?: boolean;
    reminders?: Array<{
      remind_before_value: number;
      remind_before_unit: string;
    }>;
  }): Promise<CalendarEvent> => {
    const { data } = await calendarClient.post('/events/', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    title: string;
    description: string;
    event_type: string;
    priority: string;
    start_datetime: string;
    end_datetime: string;
    all_day: boolean;
    location: string;
    case_number: string;
    assigned_to: string;
    is_legal_deadline: boolean;
  }>): Promise<CalendarEvent> => {
    const { data } = await calendarClient.patch(`/events/${id}/`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await calendarClient.delete(`/events/${id}/`);
  },

  complete: async (id: string): Promise<CalendarEvent> => {
    const { data } = await calendarClient.post(`/events/${id}/complete/`);
    return data;
  },

  addReminder: async (id: string, reminder: {
    remind_before_value: number;
    remind_before_unit: string;
  }): Promise<EventReminder> => {
    const { data } = await calendarClient.post(`/events/${id}/add-reminder/`, reminder);
    return data;
  },

  upcoming: async (): Promise<CalendarEvent[]> => {
    const { data } = await calendarClient.get('/events/upcoming/');
    return data;
  },

  overdue: async (): Promise<CalendarEvent[]> => {
    const { data } = await calendarClient.get('/events/overdue/');
    return data;
  },

  stats: async (): Promise<CalendarStats> => {
    const { data } = await calendarClient.get('/events/stats/');
    return data;
  },
};
