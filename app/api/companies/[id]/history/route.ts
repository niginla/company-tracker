import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = Promise<{ id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const supabase = await createClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('history_events')
    .select('*')
    .eq('company_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
