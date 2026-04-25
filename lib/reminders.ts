import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/types/company'

export async function sendWeeklyDigest() {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .neq('status', 'Archived')

  if (error) throw new Error(error.message)

  const all = (companies ?? []) as Company[]
  const overdue = all.filter(c => c.next_review_date && c.next_review_date < today)
  const overdueIds = new Set(overdue.map(c => c.id))
  const active = all.filter(c => c.status === 'Active' && !overdueIds.has(c.id))
  const nearTerm = all.filter(c => c.status === 'Monitor - Near Term' && !overdueIds.has(c.id))

  if (overdue.length === 0 && active.length === 0 && nearTerm.length === 0) {
    return { skipped: true, reason: 'nothing to report' }
  }

  const subject = `Weekly digest · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

  await resend.emails.send({
    from: process.env.REMINDER_FROM_EMAIL!,
    to: process.env.REMINDER_TO_EMAIL!,
    subject,
    html: buildEmail(overdue, active, nearTerm),
  })

  return { sent: true, overdue: overdue.length, active: active.length, nearTerm: nearTerm.length }
}

function buildEmail(
  overdue: Company[],
  active: Company[],
  nearTerm: Company[],
): string {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111; background: #f9f9f9; margin: 0; padding: 0;">
  <div style="max-width: 640px; margin: 32px auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">

    <div style="background: #111; padding: 20px 28px;">
      <p style="margin: 0; color: #fff; font-size: 16px; font-weight: 600;">Company Tracker · Weekly Digest</p>
      <p style="margin: 4px 0 0; color: #9ca3af; font-size: 13px;">${date}</p>
    </div>

    <div style="padding: 28px;">

      ${section('Overdue', overdue, '#dc2626', '#fef2f2', '#fecaca')}
      ${section('Active', active, '#1d4ed8', '#eff6ff', '#bfdbfe')}
      ${section('Monitor – Near Term', nearTerm, '#92400e', '#fffbeb', '#fde68a')}

      <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">
        You're receiving this because you set up a weekly digest in Company Tracker.
      </p>
    </div>
  </div>
</body>
</html>`
}

function section(
  title: string,
  companies: Company[],
  color: string,
  bg: string,
  border: string,
): string {
  if (companies.length === 0) return ''

  return `
    <div style="margin-bottom: 28px;">
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${color};">${title}</span>
        <span style="margin-left: 8px; font-size: 12px; color: #9ca3af;">${companies.length} ${companies.length === 1 ? 'company' : 'companies'}</span>
      </div>
      ${companies.map(c => companyBlock(c, bg, border)).join('')}
    </div>`
}

function companyBlock(c: Company, bg: string, border: string): string {
  const reviewDate = c.next_review_date
    ? new Date(c.next_review_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const updatedAt = new Date(c.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return `
    <div style="background: ${bg}; border: 1px solid ${border}; border-radius: 6px; padding: 14px 16px; margin-bottom: 10px;">
      <p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #111;">${esc(c.company_name)}</p>

      ${c.description ? `<p style="margin: 0 0 8px; color: #374151; font-size: 13px;">${esc(c.description)}</p>` : ''}

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #6b7280;">
        <tr>
          ${c.owner ? `<td style="padding: 2px 12px 2px 0;"><strong style="color: #374151;">Owner</strong><br>${esc(c.owner)}</td>` : ''}
          ${c.introduced_by ? `<td style="padding: 2px 12px 2px 0;"><strong style="color: #374151;">Introduced by</strong><br>${esc(c.introduced_by)}</td>` : ''}
          ${reviewDate ? `<td style="padding: 2px 0;"><strong style="color: #374151;">Next review</strong><br>${reviewDate}</td>` : ''}
        </tr>
      </table>

      ${c.next_steps ? `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.08);">
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Next steps</span>
          <p style="margin: 3px 0 0; font-size: 13px; color: #374151;">${esc(c.next_steps)}</p>
        </div>` : ''}

      <p style="margin: 8px 0 0; font-size: 11px; color: #9ca3af;">Updated ${updatedAt}</p>
    </div>`
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
