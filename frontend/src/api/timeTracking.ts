import { timeClient } from './client';
import type { TimeEntry, Timer, TimeStats } from '../types';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const timeTrackingApi = {
  // ─── Time Entries ───────────────────────────────────────────
  listEntries: (params?: Record<string, string>) =>
    timeClient.get<PaginatedResponse<TimeEntry>>('/time-entries/', { params }).then(r => r.data),

  getEntry: (id: string) =>
    timeClient.get<TimeEntry>(`/time-entries/${id}/`).then(r => r.data),

  createEntry: (data: {
    case_id: string;
    case_number?: string;
    task_type: string;
    description: string;
    date: string;
    duration_minutes: number;
    is_billable: boolean;
    hourly_rate?: string;
  }) => timeClient.post<TimeEntry>('/time-entries/', data).then(r => r.data),

  updateEntry: (id: string, data: Partial<TimeEntry>) =>
    timeClient.patch<TimeEntry>(`/time-entries/${id}/`, data).then(r => r.data),

  deleteEntry: (id: string) =>
    timeClient.delete(`/time-entries/${id}/`).then(r => r.data),

  getStats: (params?: Record<string, string>) =>
    timeClient.get<TimeStats>('/time-entries/stats/', { params }).then(r => r.data),

  // ─── Timers ─────────────────────────────────────────────────
  getActiveTimer: () =>
    timeClient.get<Timer>('/timers/active/').then(r => r.data),

  startTimer: (data: {
    case_id: string;
    case_number?: string;
    task_type: string;
    description?: string;
    is_billable: boolean;
  }) => timeClient.post<Timer>('/timers/start/', data).then(r => r.data),

  pauseTimer: (id: string) =>
    timeClient.post<Timer>(`/timers/${id}/pause/`).then(r => r.data),

  resumeTimer: (id: string) =>
    timeClient.post<Timer>(`/timers/${id}/resume/`).then(r => r.data),

  stopTimer: (id: string) =>
    timeClient.post<{ timer: Timer; time_entry: TimeEntry }>(`/timers/${id}/stop/`).then(r => r.data),

  discardTimer: (id: string) =>
    timeClient.delete(`/timers/${id}/discard/`).then(r => r.data),
};
