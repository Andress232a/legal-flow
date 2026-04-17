export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'lawyer' | 'assistant' | 'client';
  phone: string;
  bar_number: string;
  department: string;
  is_active: boolean;
  roles: string[];
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
  parent: string | null;
  parent_name: string | null;
  permissions_count: number;
  created_at: string;
  updated_at: string;
}

export interface RoleDetail extends Role {
  permissions: RolePermission[];
}

export interface Permission {
  id: string;
  codename: string;
  name: string;
  description: string;
  resource_type: string;
  action: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  permission: string;
  permission_detail: Permission;
  granted_at: string;
  granted_by: string | null;
}

export interface Document {
  id: string;
  title: string;
  description: string;
  document_type: string;
  status: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  case_id: string;
  uploaded_by: string;
  current_version: number;
  is_confidential: boolean;
  tags: string[];
  versions_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  file_hash: string;
  change_summary: string;
  created_by: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface CheckPermissionRequest {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
}

// ─── Matter Service ────────────────────────────────────────────────────────────

export type CaseStatus = 'open' | 'in_progress' | 'on_hold' | 'in_appeal' | 'closed' | 'archived';
export type CaseType = 'civil' | 'criminal' | 'corporate' | 'family' | 'labor' | 'administrative' | 'constitutional' | 'other';
export type PartyRole = 'client' | 'opposing_party' | 'lawyer' | 'prosecutor' | 'witness' | 'expert' | 'judge' | 'other';
export type DateType = 'hearing' | 'deadline' | 'filing' | 'trial' | 'appeal' | 'notification' | 'meeting' | 'other';

export interface CaseParty {
  id: string;
  case: string;
  full_name: string;
  role: PartyRole;
  role_display: string;
  email: string;
  phone: string;
  identification: string;
  address: string;
  notes: string;
  user_id: string | null;
  created_at: string;
}

export interface CaseDate {
  id: string;
  case: string;
  title: string;
  description: string;
  date_type: DateType;
  date_type_display: string;
  scheduled_date: string;
  is_critical: boolean;
  is_completed: boolean;
  completed_at: string | null;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CaseActivityLog {
  id: string;
  case: string;
  activity_type: string;
  activity_type_display: string;
  user_id: string;
  description: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  timestamp: string;
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  case_type: CaseType;
  case_type_display: string;
  status: CaseStatus;
  status_display: string;
  jurisdiction: string;
  court: string;
  assigned_lawyer_id: string;
  client_id: string;
  opened_at: string;
  closed_at: string | null;
  is_urgent: boolean;
  tags: string[];
  notes: string;
  parties: CaseParty[];
  dates: CaseDate[];
  parties_count: number;
  upcoming_dates_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CaseStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  urgent: number;
  open: number;
  closed: number;
}

// ─── Time Tracking ────────────────────────────────────────────────────────────

export type TaskType =
  | 'research' | 'drafting' | 'court' | 'client_meeting'
  | 'negotiation' | 'review' | 'admin' | 'travel' | 'other';

export interface TimeEntry {
  id: string;
  case_id: string;
  case_number: string;
  user_id: string;
  user_name: string;
  task_type: TaskType;
  task_type_display: string;
  description: string;
  date: string;
  duration_minutes: number;
  duration_hours: number;
  is_billable: boolean;
  hourly_rate: string | null;
  billable_amount: number;
  created_from_timer: boolean;
  created_at: string;
  updated_at: string;
}

export interface Timer {
  id: string;
  case_id: string;
  case_number: string;
  user_id: string;
  task_type: TaskType;
  task_type_display: string;
  description: string;
  is_billable: boolean;
  status: 'running' | 'paused' | 'stopped';
  status_display: string;
  started_at: string;
  paused_at: string | null;
  stopped_at: string | null;
  accumulated_seconds: number;
  elapsed_seconds: number;
  elapsed_minutes: number;
  created_at: string;
}

export interface TimeStats {
  total_entries: number;
  total_minutes: number;
  total_hours: number;
  billable_minutes: number;
  billable_hours: number;
  billable_amount: number;
  entries_by_task_type: Record<string, { minutes: number; count: number }>;
  entries_by_case: Array<{ case_id: string; case_number: string; minutes: number; count: number }>;
  active_timer: Timer | null;
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'transfer' | 'cash' | 'card' | 'check' | 'other';

export interface InvoiceItem {
  id: string;
  invoice: string;
  time_entry_id: string | null;
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
}

export interface Payment {
  id: string;
  invoice: string;
  amount: string;
  method: PaymentMethod;
  method_display: string;
  payment_date: string;
  reference: string;
  notes: string;
  registered_by: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  case_id: string;
  client_id: string;
  lawyer_id: string;
  created_by: string;
  status: InvoiceStatus;
  status_display: string;
  issue_date: string;
  due_date: string;
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
  amount_paid: string;
  balance_due: string;
  notes: string;
  case_number: string;
  client_name: string;
  items_count?: number;
  items?: InvoiceItem[];
  payments?: Payment[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  cancelled: number;
  total_billed: string;
  total_paid: string;
  total_pending: string;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export type EventType = 'hearing' | 'deadline' | 'filing' | 'trial' | 'appeal' | 'notification' | 'meeting' | 'payment' | 'other';
export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

export interface EventReminder {
  id: string;
  remind_before_value: number;
  remind_before_unit: 'minutes' | 'hours' | 'days';
  is_sent: boolean;
  sent_at: string | null;
  remind_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_type: EventType;
  event_type_display: string;
  priority: EventPriority;
  priority_display: string;
  start_datetime: string;
  end_datetime: string | null;
  all_day: boolean;
  location: string;
  case_id: string | null;
  case_date_id: string | null;
  case_number: string;
  assigned_to: string;
  created_by: string;
  is_legal_deadline: boolean;
  is_completed: boolean;
  completed_at: string | null;
  reminders_count?: number;
  reminders?: EventReminder[];
  created_at: string;
  updated_at: string;
}

export interface CalendarStats {
  total: number;
  upcoming: number;
  overdue: number;
  completed: number;
  legal_deadlines: number;
  critical: number;
  by_type: Record<string, number>;
}

