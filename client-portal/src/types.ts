export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  user_type: 'admin' | 'lawyer' | 'assistant' | 'client' | string
}

export interface CaseListItem {
  id: string
  title: string
  case_number: string
  status: string
  status_display?: string
  case_type: string
  assigned_lawyer_id: string
  opened_at: string
}

export interface PortalMessage {
  id: string
  case_id: string
  sender_id: string
  recipient_id: string
  body: string
  read_at: string | null
  created_at: string
}
