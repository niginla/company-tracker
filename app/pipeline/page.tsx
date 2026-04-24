'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Company, Status } from '@/types/company'

const STATUSES: Status[] = ['Inbox', 'Active', 'Monitor - Near Term', 'Monitor - Longer Term']

const STATUS_COLORS: Record<string, string> = {
  'Inbox': 'bg-gray-100 text-gray-700',
  'Active': 'bg-blue-100 text-blue-700',
  'Monitor - Near Term': 'bg-yellow-100 text-yellow-700',
  'Monitor - Longer Term': 'bg-orange-100 text-orange-700',
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function isOverdue(c: Company) {
  return !!c.next_review_date && c.next_review_date < today()
}

function formatDate(str: string | null) {
  if (!str) return '—'
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}


export default function PipelinePage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [sectorFilter, setSectorFilter] = useState<string>('All')
  const [overdueFilter, setOverdueFilter] = useState<string>('All')

  useEffect(() => {
    fetch('/api/companies')
      .then(r => r.json())
      .then(data => {
        setCompanies(data)
        setLoading(false)
      })
  }, [])

  const sectors = useMemo(() => {
    const vals = companies.map(c => c.sector).filter((s): s is string => !!s)
    return Array.from(new Set(vals)).sort()
  }, [companies])

  const filtered = useMemo(() => {
    return companies.filter(c => {
      if (search && !c.company_name.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== 'All' && c.status !== statusFilter) return false
      if (sectorFilter !== 'All' && c.sector !== sectorFilter) return false
      if (overdueFilter === 'Overdue' && !isOverdue(c)) return false
      if (overdueFilter === 'Not overdue' && isOverdue(c)) return false
      return true
    })
  }, [companies, search, statusFilter, sectorFilter, overdueFilter])

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto py-8 px-4 space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search company name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-56"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="All">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {sectors.length > 0 && (
            <select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="All">All sectors</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select
            value={overdueFilter}
            onChange={e => setOverdueFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="All">All</option>
            <option value="Overdue">Overdue</option>
            <option value="Not overdue">Not overdue</option>
          </select>
          {(search || statusFilter !== 'All' || sectorFilter !== 'All' || overdueFilter !== 'All') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('All'); setSectorFilter('All'); setOverdueFilter('All') }}
              className="text-sm text-gray-400 hover:text-gray-900"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-sm text-gray-400 py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 py-8">No companies match the current filters.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sector</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">EBITDA</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Next steps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => {
                  const overdue = isOverdue(c)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/companies/${c.id}`} className="font-medium text-gray-900 hover:underline">
                          {c.company_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.sector || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.owner || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.revenue || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.ebitda || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.next_steps || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
              {filtered.length} {filtered.length === 1 ? 'company' : 'companies'}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
