'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Company, Status } from '@/types/company'
import { defaultReviewDate } from '@/lib/review-cadence'

const REOPEN_STATUSES: Status[] = ['Inbox', 'Active', 'Monitor - Near Term', 'Monitor - Longer Term']

function formatDate(str: string) {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ArchivePage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [nameSearch, setNameSearch] = useState('')
  const [reasonSearch, setReasonSearch] = useState('')
  const [reopenStatus, setReopenStatus] = useState<Record<string, Status>>({})
  const [reopening, setReopening] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/companies?archived=true')
      .then(r => r.json())
      .then(data => { setCompanies(data); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    return companies.filter(c => {
      if (nameSearch && !c.company_name.toLowerCase().includes(nameSearch.toLowerCase())) return false
      if (reasonSearch && !(c.archive_reason ?? '').toLowerCase().includes(reasonSearch.toLowerCase())) return false
      return true
    })
  }, [companies, nameSearch, reasonSearch])

  function getStatus(id: string): Status {
    return reopenStatus[id] ?? 'Inbox'
  }

  async function handleReopen(company: Company) {
    const status = getStatus(company.id)
    setReopening(prev => ({ ...prev, [company.id]: true }))

    const res = await fetch(`/api/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, next_review_date: defaultReviewDate(status) }),
    })

    if (res.ok) {
      setCompanies(prev => prev.filter(c => c.id !== company.id))
    }
    setReopening(prev => ({ ...prev, [company.id]: false }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto py-8 px-4 space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search company name…"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-52"
          />
          <input
            type="text"
            placeholder="Filter by archive reason…"
            value={reasonSearch}
            onChange={e => setReasonSearch(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-52"
          />
          {(nameSearch || reasonSearch) && (
            <button
              onClick={() => { setNameSearch(''); setReasonSearch('') }}
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
          <p className="text-sm text-gray-400 py-8">
            {companies.length === 0 ? 'No archived companies yet.' : 'No companies match the current filters.'}
          </p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Archive reason</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Archived on</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reopen as</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/companies/${c.id}`} className="font-medium text-gray-900 hover:underline">
                        {c.company_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {c.archive_reason || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.archived_at ? formatDate(c.archived_at.split('T')[0]) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={getStatus(c.id)}
                        onChange={e => setReopenStatus(prev => ({ ...prev, [c.id]: e.target.value as Status }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        {REOPEN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleReopen(c)}
                        disabled={reopening[c.id]}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50"
                      >
                        {reopening[c.id] ? 'Reopening…' : 'Reopen'}
                      </button>
                    </td>
                  </tr>
                ))}
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
