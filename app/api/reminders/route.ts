import { NextResponse } from 'next/server'
import { sendWeeklyDigest } from '@/lib/reminders'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')

  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendWeeklyDigest()
    return NextResponse.json(result)
  } catch (err) {
    console.error('Weekly digest failed:', err)
    return NextResponse.json({ error: 'Failed to send digest' }, { status: 500 })
  }
}
