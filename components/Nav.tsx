'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/archive', label: 'Archive' },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold text-gray-900">Company Tracker</span>
        <div className="flex items-center gap-1">
          {links.map(link => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm ${
                  active
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/companies/new"
          className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded hover:bg-gray-700"
        >
          + Add
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-400 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
