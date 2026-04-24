import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = Promise<{ id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const supabase = await createClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('company_notes')
    .select('*')
    .eq('company_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Params }) {
  const supabase = await createClient()
  const { id } = await params
  const { body } = await request.json()

  if (!body?.trim()) {
    return NextResponse.json({ error: 'Note body is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('company_notes')
    .insert({ company_id: id, body: body.trim(), note_type: 'general' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
