import type { Status } from '@/types/company'

const CADENCE_DAYS: Record<Status, number | null> = {
  'Inbox': 3,
  'Active': 14,
  'Monitor - Near Term': 21,
  'Monitor - Longer Term': 60,
  'Archived': null,
}

export function defaultReviewDate(status: Status): string | null {
  const days = CADENCE_DAYS[status]
  if (days === null) return null
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}
