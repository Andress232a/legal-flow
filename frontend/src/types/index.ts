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
