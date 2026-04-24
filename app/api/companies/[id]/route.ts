import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = Promise<{ id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const supabase = await createClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()

  const { data: current, error: fetchError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const update: Record<string, unknown> = { ...body }

  if (body.status === 'Archived' && current.status !== 'Archived') {
    update.archived_at = new Date().toISOString()
  } else if (body.status && body.status !== 'Archived' && current.status === 'Archived') {
    update.archived_at = null
    update.archive_reason = null
  }

  const { data: updated, error } = await supabase
    .from('companies')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // write history events for meaningful changes
  const events: { company_id: string; event_type: string; old_value: string | null; new_value: string | null }[] = []

  if (body.status && body.status !== current.status) {
    if (body.status === 'Archived') {
      events.push({ company_id: id, event_type: 'archived', old_value: current.status, new_value: body.status })
    } else if (current.status === 'Archived') {
      events.push({ company_id: id, event_type: 'reopened', old_value: current.status, new_value: body.status })
    } else {
      events.push({ company_id: id, event_type: 'status_changed', old_value: current.status, new_value: body.status })
    }
  }

  if (body.next_review_date !== undefined && body.next_review_date !== current.next_review_date) {
    events.push({ company_id: id, event_type: 'review_date_changed', old_value: current.next_review_date, new_value: body.next_review_date })
  }

  if (events.length > 0) {
    await supabase.from('history_events').insert(events)
  }

  return NextResponse.json(updated)
}
