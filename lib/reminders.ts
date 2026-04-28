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

  const appUrl = (process.env.APP_URL ?? '').replace(/\/$/, '')

  await resend.emails.send({
    from: process.env.REMINDER_FROM_EMAIL!,
    to: process.env.REMINDER_TO_EMAIL!,
    subject,
    html: buildEmail(overdue, active, nearTerm, appUrl),
  })

  return { sent: true, overdue: overdue.length, active: active.length, nearTerm: nearTerm.length }
}

function buildEmail(overdue: Company[], active: Company[], nearTerm: Company[], appUrl: string): string {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;">

        <!-- Header -->
        <tr>
          <td bgcolor="#111111" style="padding:20px 28px;">
            <p style="margin:0;color:#ffffff;font-size:16px;font-weight:bold;font-family:Arial,sans-serif;">Company Tracker &middot; Weekly Digest</p>
            <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;font-family:Arial,sans-serif;">${date}</p>
            ${appUrl ? `<p style="margin:8px 0 0;font-size:13px;font-family:Arial,sans-serif;"><a href="${appUrl}" style="color:#93c5fd;text-decoration:underline;">Open dashboard &rarr;</a></p>` : ''}
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px;">

            ${section('OVERDUE', overdue, '#b91c1c', appUrl)}
            ${section('ACTIVE', active, '#1d4ed8', appUrl)}
            ${section('MONITOR – NEAR TERM', nearTerm, '#92400e', appUrl)}

            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">
              Weekly digest from Company Tracker.
            </p>

          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function section(title: string, companies: Company[], color: string, appUrl: string): string {
  if (companies.length === 0) return ''

  const rows = companies.map(c => companyBlock(c, appUrl)).join(`
    <tr><td style="padding:0;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-bottom:1px solid #e5e7eb;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
  `)

  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <!-- Section heading -->
      <tr>
        <td style="padding:0 0 10px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:12px;font-weight:bold;color:${color};font-family:Arial,sans-serif;letter-spacing:0.05em;">${title}</td>
              <td align="right" style="font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">${companies.length} ${companies.length === 1 ? 'company' : 'companies'}</td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Companies -->
      <tr>
        <td style="border:1px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${rows}
          </table>
        </td>
      </tr>
    </table>`
}

function companyBlock(c: Company, appUrl: string): string {
  const reviewDate = c.next_review_date
    ? new Date(c.next_review_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const meta = [
    c.owner ? `<b>Owner:</b> ${esc(c.owner)}` : null,
    c.banker ? `<b>Banker:</b> ${esc(c.banker)}` : null,
    reviewDate ? `<b>Next review:</b> ${reviewDate}` : null,
  ].filter(Boolean).join('&nbsp;&nbsp;&nbsp;')

  return `
    <tr>
      <td style="padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:bold;font-family:Arial,sans-serif;">
          ${appUrl ? `<a href="${appUrl}/companies/${c.id}" style="color:#111111;text-decoration:underline;">${esc(c.company_name)}</a>` : esc(c.company_name)}
        </p>
        ${c.description ? `<p style="margin:0 0 8px;font-size:13px;color:#374151;font-family:Arial,sans-serif;">${esc(c.description)}</p>` : ''}
        ${meta ? `<p style="margin:0 0 8px;font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">${meta}</p>` : ''}
        ${c.next_steps ? `
        <p style="margin:0;font-size:12px;font-family:Arial,sans-serif;">
          <span style="color:#6b7280;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;">Next steps:</span>
          <span style="color:#374151;"> ${esc(c.next_steps)}</span>
        </p>` : ''}
      </td>
    </tr>`
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
