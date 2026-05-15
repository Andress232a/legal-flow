import { analyticsClient } from './client';

export interface KpisResponse {
  cases: number | null;
  documents: number | null;
  time_entries: number | null;
  invoices: number | null;
  calendar_events: number | null;
}

export interface AnalyticsDashboard {
  cases: {
    total: number;
    open: number;
    closed: number;
    urgent: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
  };
  billing: {
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    total_billed: string;
    total_paid: string;
    total_pending: string;
  };
  time: {
    total_entries: number;
    total_hours: number;
    billable_hours: number;
    billable_amount: number;
  };
  calendar: {
    total: number;
    upcoming: number;
    overdue: number;
    completed: number;
    legal_deadlines: number;
    critical: number;
  };
}

export interface DeadlineCompliance {
  total_deadlines: number;
  completed: number;
  overdue: number;
  compliance_rate: number;
}

export const analyticsApi = {
  kpis: async (): Promise<KpisResponse> => {
    const { data } = await analyticsClient.get('/kpis/');
    return data;
  },

  dashboard: async (): Promise<AnalyticsDashboard> => {
    const { data } = await analyticsClient.get('/dashboard/');
    return data;
  },

  deadlineCompliance: async (): Promise<DeadlineCompliance> => {
    const { data } = await analyticsClient.get('/deadline-compliance/');
    return data;
  },
};
