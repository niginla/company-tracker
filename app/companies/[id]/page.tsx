'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Company, CompanyNote, HistoryEvent, Status } from '@/types/company'
import { defaultReviewDate } from '@/lib/review-cadence'

const ACTIVE_STATUSES: Status[] = ['Inbox', 'Active', 'Monitor - Near Term', 'Monitor - Longer Term']

const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDate(str: string) {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function historyLabel(event: HistoryEvent): string {
  switch (event.event_type) {
    case 'created':
      return 'Company created'
    case 'status_changed':
      return `Status changed: ${event.old_value} → ${event.new_value}`
    case 'review_date_changed': {
      const from = event.old_value ? formatDate(event.old_value) : 'none'
      const to = event.new_value ? formatDate(event.new_value) : 'none'
      return `Review date changed: ${from} → ${to}`
    }
    case 'archived':
      return `Archived (was: ${event.old_value})`
    case 'reopened':
      return `Reopened as ${event.new_value}`
    default:
      return event.event_type
  }
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [form, setForm] = useState<Partial<Company>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [notes, setNotes] = useState<CompanyNote[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const [history, setHistory] = useState<HistoryEvent[]>([])

  // archive form state
  const [showArchiveForm, setShowArchiveForm] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')
  const [archiving, setArchiving] = useState(false)

  // reopen state
  const [reopenStatus, setReopenStatus] = useState<Status>('Inbox')
  const [reopening, setReopening] = useState(false)

  function refreshHistory() {
    fetch(`/api/companies/${id}/history`)
      .then(r => r.json())
      .then(setHistory)
  }

  useEffect(() => {
    fetch(`/api/companies/${id}`)
      .then(r => r.json())
      .then(data => {
        setCompany(data)
        setForm(data)
        setLoading(false)
      })
    fetch(`/api/companies/${id}/notes`)
      .then(r => r.json())
      .then(setNotes)
    refreshHistory()
  }, [id])

  function set(field: keyof Company, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value || null }
      if (field === 'status') {
        next.next_review_date = defaultReviewDate(value as Status)
      }
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error || 'Failed to save')
      setSaving(false)
      return
    }

    const updated = await res.json()
    setCompany(updated)
    setForm(updated)
    setSaved(true)
    setSaving(false)
    refreshHistory()
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleArchive() {
    setArchiving(true)

    const res = await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Archived',
        archive_reason: archiveReason.trim() || null,
      }),
    })

    if (res.ok) {
      const updated = await res.json()
      setCompany(updated)
      setForm(updated)
      setShowArchiveForm(false)
      setArchiveReason('')
      refreshHistory()
    }
    setArchiving(false)
  }

  async function handleReopen() {
    setReopening(true)

    const res = await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: reopenStatus,
        next_review_date: defaultReviewDate(reopenStatus),
      }),
    })

    if (res.ok) {
      const updated = await res.json()
      setCompany(updated)
      setForm(updated)
      refreshHistory()
    }
    setReopening(false)
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteBody.trim()) return
    setSavingNote(true)

    const res = await fetch(`/api/companies/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: noteBody }),
    })

    if (res.ok) {
      const newNote = await res.json()
      setNotes(prev => [newNote, ...prev])
      setNoteBody('')
      noteRef.current?.focus()
    }
    setSavingNote(false)
  }

  if (loading) return <div className="p-10 text-sm text-gray-400">Loading…</div>
  if (!company) return <div className="p-10 text-sm text-gray-400">Company not found.</div>

  const isArchived = company.status === 'Archived'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-gray-900">← Dashboard</button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900 truncate">{company.company_name}</span>
        {isArchived && (
          <span className="ml-1 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Archived</span>
        )}
      </nav>

      <main className="max-w-2xl mx-auto py-8 px-4 space-y-4">

        {/* Archived banner */}
        {isArchived && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-amber-900">
                Archived {company.archived_at ? `on ${formatDate(company.archived_at.split('T')[0])}` : ''}
              </p>
              {company.archive_reason && (
                <p className="text-sm text-amber-700 mt-0.5">Reason: {company.archive_reason}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-amber-800">Reopen as</span>
              <select
                value={reopenStatus}
                onChange={e => setReopenStatus(e.target.value as Status)}
                className="border border-amber-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {ACTIVE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={handleReopen}
                disabled={reopening}
                className="bg-amber-700 text-white rounded px-3 py-1 text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
              >
                {reopening ? 'Reopening…' : 'Reopen'}
              </button>
            </div>
          </div>
        )}

        {/* Main form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">

          <Field label="Company name" required>
            <input
              type="text"
              value={form.company_name ?? ''}
              onChange={e => set('company_name', e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Revenue">
              <input
                type="text"
                value={form.revenue ?? ''}
                onChange={e => set('revenue', e.target.value)}
                placeholder="e.g. $5M"
                className={inputClass}
              />
            </Field>
            <Field label="EBITDA">
              <input
                type="text"
                value={form.ebitda ?? ''}
                onChange={e => set('ebitda', e.target.value)}
                placeholder="e.g. $1.2M"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Owner">
              <input
                type="text"
                value={form.owner ?? ''}
                onChange={e => set('owner', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Introduced by">
              <input
                type="text"
                value={form.introduced_by ?? ''}
                onChange={e => set('introduced_by', e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Sector">
            <input
              type="text"
              value={form.sector ?? ''}
              onChange={e => set('sector', e.target.value)}
              placeholder="e.g. Healthcare, SaaS, Manufacturing"
              className={inputClass}
            />
          </Field>

          <Field label="Next steps">
            <textarea
              value={form.next_steps ?? ''}
              onChange={e => set('next_steps', e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </Field>

          {!isArchived && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Status">
                <select
                  value={form.status ?? 'Inbox'}
                  onChange={e => set('status', e.target.value)}
                  className={inputClass}
                >
                  {ACTIVE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Next review date">
                <input
                  type="date"
                  value={form.next_review_date ?? ''}
                  onChange={e => set('next_review_date', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-gray-900 text-white rounded px-5 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {saved && <span className="text-sm text-green-600">Saved</span>}
            </div>

            {!isArchived && !showArchiveForm && (
              <button
                onClick={() => setShowArchiveForm(true)}
                className="text-sm text-gray-400 hover:text-red-600"
              >
                Archive
              </button>
            )}
          </div>

          {/* Inline archive form */}
          {showArchiveForm && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">Archive this company</p>
              <input
                type="text"
                value={archiveReason}
                onChange={e => setArchiveReason(e.target.value)}
                placeholder="Reason (optional)"
                autoFocus
                className={inputClass}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="bg-red-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {archiving ? 'Archiving…' : 'Confirm archive'}
                </button>
                <button
                  onClick={() => { setShowArchiveForm(false); setArchiveReason('') }}
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 flex gap-6 text-xs text-gray-400">
            <span>Created {formatDateTime(company.created_at)}</span>
            <span>Updated {formatDateTime(company.updated_at)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Notes</h2>

          <form onSubmit={handleAddNote} className="space-y-2">
            <textarea
              ref={noteRef}
              value={noteBody}
              onChange={e => setNoteBody(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote(e)
              }}
              placeholder="Add a note… (Cmd+Enter to save)"
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <button
              type="submit"
              disabled={savingNote || !noteBody.trim()}
              className="bg-gray-900 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
            >
              {savingNote ? 'Saving…' : 'Add note'}
            </button>
          </form>

          {notes.length === 0 ? (
            <p className="text-sm text-gray-400">No notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {notes.map(note => (
                <li key={note.id} className="border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(note.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* History */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400">No history yet.</p>
          ) : (
            <ul className="space-y-2">
              {history.map(event => (
                <li key={event.id} className="flex items-start gap-3 text-sm">
                  <span className="text-gray-300 mt-0.5 select-none">·</span>
                  <div>
                    <span className="text-gray-800">{historyLabel(event)}</span>
                    <span className="text-gray-400 text-xs ml-2">{formatDateTime(event.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </main>
    </div>
  )
}
