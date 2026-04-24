export type Status =
  | 'Inbox'
  | 'Active'
  | 'Monitor - Near Term'
  | 'Monitor - Longer Term'
  | 'Archived'

export interface Company {
  id: string
  company_name: string
  description: string | null
  revenue: string | null
  ebitda: string | null
  owner: string | null
  introduced_by: string | null
  next_steps: string | null
  sector: string | null
  status: Status
  next_review_date: string | null
  last_reviewed_at: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  archive_reason: string | null
}

export interface CompanyNote {
  id: string
  company_id: string
  body: string
  note_type: 'general' | 'call' | 'meeting' | 'email' | 'other'
  created_at: string
}

export interface HistoryEvent {
  id: string
  company_id: string
  event_type: 'created' | 'status_changed' | 'review_date_changed' | 'archived' | 'reopened'
  old_value: string | null
  new_value: string | null
  created_at: string
}
