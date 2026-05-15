import { billingClient } from './client';
import type { Invoice, InvoiceItem, Payment, InvoiceStats, FeeStructure, PaginatedResponse } from '../types';

export const billingApi = {
  list: async (params?: {
    page?: number;
    status?: string;
    case_id?: string;
    client_id?: string;
    lawyer_id?: string;
    search?: string;
  }): Promise<PaginatedResponse<Invoice>> => {
    const { data } = await billingClient.get('/invoices/', { params });
    return data;
  },

  get: async (id: string): Promise<Invoice> => {
    const { data } = await billingClient.get(`/invoices/${id}/`);
    return data;
  },

  create: async (payload: {
    case_id: string;
    client_id: string;
    lawyer_id?: string;
    issue_date: string;
    due_date: string;
    tax_rate?: string;
    notes?: string;
    case_number?: string;
    client_name?: string;
    items?: Array<{
      description: string;
      quantity: string;
      unit_price: string;
      time_entry_id?: string;
    }>;
  }): Promise<Invoice> => {
    const { data } = await billingClient.post('/invoices/', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    status: string;
    due_date: string;
    tax_rate: string;
    notes: string;
    client_name: string;
    case_number: string;
  }>): Promise<Invoice> => {
    const { data } = await billingClient.patch(`/invoices/${id}/`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await billingClient.delete(`/invoices/${id}/`);
  },

  changeStatus: async (id: string, status: string): Promise<Invoice> => {
    const { data } = await billingClient.post(`/invoices/${id}/change-status/`, { status });
    return data;
  },

  addItem: async (id: string, item: {
    description: string;
    quantity: string;
    unit_price: string;
    time_entry_id?: string;
  }): Promise<InvoiceItem> => {
    const { data } = await billingClient.post(`/invoices/${id}/add-item/`, item);
    return data;
  },

  removeItem: async (invoiceId: string, itemId: string): Promise<void> => {
    await billingClient.delete(`/invoices/${invoiceId}/remove-item/${itemId}/`);
  },

  addPayment: async (id: string, payment: {
    amount: string;
    method: string;
    payment_date: string;
    reference?: string;
    notes?: string;
  }): Promise<Payment> => {
    const { data } = await billingClient.post(`/invoices/${id}/add-payment/`, payment);
    return data;
  },

  send: async (id: string): Promise<Invoice> => {
    const { data } = await billingClient.post(`/invoices/${id}/send/`);
    return data;
  },

  stats: async (): Promise<InvoiceStats> => {
    const { data } = await billingClient.get('/invoices/stats/');
    return data;
  },

  feeStructures: {
    list: async (params?: { case_id?: string; fee_type?: string }): Promise<PaginatedResponse<FeeStructure>> => {
      const { data } = await billingClient.get('/fee-structures/', { params });
      return data;
    },
    get: async (id: string): Promise<FeeStructure> => {
      const { data } = await billingClient.get(`/fee-structures/${id}/`);
      return data;
    },
    create: async (payload: {
      case_id: string;
      fee_type: 'flat_rate' | 'hourly' | 'success_fee';
      flat_amount?: string;
      hourly_rate?: string;
      success_percentage?: string;
      estimated_case_value?: string;
      notes?: string;
    }): Promise<FeeStructure> => {
      const { data } = await billingClient.post('/fee-structures/', payload);
      return data;
    },
    update: async (id: string, payload: Partial<{
      fee_type: string;
      flat_amount: string;
      hourly_rate: string;
      success_percentage: string;
      estimated_case_value: string;
      notes: string;
    }>): Promise<FeeStructure> => {
      const { data } = await billingClient.patch(`/fee-structures/${id}/`, payload);
      return data;
    },
    delete: async (id: string): Promise<void> => {
      await billingClient.delete(`/fee-structures/${id}/`);
    },
  },
};
