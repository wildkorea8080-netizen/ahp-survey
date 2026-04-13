'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/responses', label: '응답 목록' },
  { href: '/admin/analysis', label: '집단 분석' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <header className="border-b bg-[#1F497D] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs text-blue-200">{process.env.NEXT_PUBLIC_ORG_NAME}</p>
          <span className="text-sm font-bold">AHP 관리자</span>
        </div>
        <nav className="flex gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  active ? 'bg-white text-[#1F497D] font-medium' : 'hover:bg-[#17375E]'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-white hover:bg-[#17375E] hover:text-white"
        >
          로그아웃
        </Button>
      </div>
    </header>
  )
}
