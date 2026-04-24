import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/types/company'

function isOverdue(company: Company): boolean {
  if (!company.next_review_date) return false
  return company.next_review_date < new Date().toISOString().split('T')[0]
}

function isDueSoon(company: Company): boolean {
  if (!company.next_review_date) return false
  const today = new Date().toISOString().split('T')[0]
  const soon = new Date()
  soon.setDate(soon.getDate() + 7)
  const soonStr = soon.toISOString().split('T')[0]
  return company.next_review_date >= today && company.next_review_date <= soonStr
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  })
}

function StatusBadge({ status }: { status: Company['status'] }) {
  const colors: Record<string, string> = {
    'Inbox': 'bg-gray-100 text-gray-700',
    'Active': 'bg-blue-100 text-blue-700',
    'Monitor - Near Term': 'bg-yellow-100 text-yellow-700',
    'Monitor - Longer Term': 'bg-orange-100 text-orange-700',
    'Archived': 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function CompanyRow({ company }: { company: Company }) {
  const overdue = isOverdue(company)
  return (
    <Link
      href={`/companies/${company.id}`}
      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-gray-900 truncate">{company.company_name}</span>
        {company.introduced_by && (
          <span className="text-xs text-gray-400">via {company.introduced_by}</span>
        )}
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <StatusBadge status={company.status} />
        {company.next_review_date && (
          <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            {overdue ? `Overdue · ${formatDate(company.next_review_date)}` : formatDate(company.next_review_date)}
          </span>
        )}
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: companies = [] } = await supabase
    .from('companies')
    .select('*')
    .neq('status', 'Archived')
    .order('next_review_date', { ascending: true, nullsFirst: false })

  const overdue = (companies as Company[]).filter(isOverdue)
  const dueSoon = (companies as Company[]).filter(isDueSoon)
  const inbox = (companies as Company[]).filter(c => c.status === 'Inbox' && !isOverdue(c) && !isDueSoon(c))

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto py-8 px-4 space-y-6">

        {/* Overdue */}
        {overdue.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
              Overdue ({overdue.length})
            </h2>
            <div className="bg-white rounded-lg border border-red-200 divide-y divide-gray-100 overflow-hidden">
              {overdue.map(c => <CompanyRow key={c.id} company={c} />)}
            </div>
          </section>
        )}

        {/* Due this week */}
        {dueSoon.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Due this week ({dueSoon.length})
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {dueSoon.map(c => <CompanyRow key={c.id} company={c} />)}
            </div>
          </section>
        )}

        {/* Inbox */}
        {inbox.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Inbox ({inbox.length})
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {inbox.map(c => <CompanyRow key={c.id} company={c} />)}
            </div>
          </section>
        )}

        {overdue.length === 0 && dueSoon.length === 0 && inbox.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            Nothing needs attention right now.{' '}
            <Link href="/companies/new" className="text-gray-900 underline">Add a company</Link>
          </div>
        )}

      </main>
    </div>
  )
}
