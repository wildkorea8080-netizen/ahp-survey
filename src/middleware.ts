import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // /api/admin/* → 미인증 시 401
  if (pathname.startsWith('/api/admin/')) {
    if (!isLoggedIn) {
      return NextResponse.json(
        { error: '인증이 필요합니다', code: 'UNAUTHORIZED', statusCode: 401 },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // /admin/* → 미인증 시 /login 리다이렉트
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
