import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { defaultReviewDate } from '@/lib/review-cadence'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const archived = searchParams.get('archived') === 'true'

  const query = supabase.from('companies').select('*')

  if (archived) {
    query.eq('status', 'Archived').order('archived_at', { ascending: false })
  } else {
    query.neq('status', 'Archived').order('next_review_date', { ascending: true, nullsFirst: false })
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { company_name, description, introduced_by, sector, next_steps } = body

  if (!company_name?.trim() || !description?.trim() || !introduced_by?.trim()) {
    return NextResponse.json({ error: 'company_name, description, and introduced_by are required' }, { status: 400 })
  }

  const { data: company, error } = await supabase
    .from('companies')
    .insert({
      company_name: company_name.trim(),
      description: description.trim(),
      introduced_by: introduced_by.trim(),
      sector: sector?.trim() || null,
      next_steps: next_steps?.trim() || null,
      status: 'Inbox',
      next_review_date: defaultReviewDate('Inbox'),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('history_events').insert({
    company_id: company.id,
    event_type: 'created',
    old_value: null,
    new_value: null,
  })

  return NextResponse.json(company, { status: 201 })
}
