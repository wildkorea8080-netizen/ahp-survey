import { notFound } from 'next/navigation'
import SurveyClient from './SurveyClient'

interface Props {
  params: Promise<{ token: string }>
}

export default async function SurveyPage({ params }: Props) {
  const { token } = await params

  // 서버에서 토큰 유효성 사전 확인
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/survey/${token}`,
    { cache: 'no-store' }
  )

  if (!res.ok) return notFound()

  const data = await res.json() as {
    surveyTitle: string
    roundNo: number
    isOpen: boolean
  }

  if (!data.isOpen) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-bold text-[#1F497D]">{data.surveyTitle}</h1>
          <p className="text-[#5F5E5A]">이 설문은 마감되었습니다.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <p className="text-xs text-[#5F5E5A]">{process.env.NEXT_PUBLIC_ORG_NAME}</p>
          <h1 className="text-base font-bold text-[#1F497D]">{data.surveyTitle}</h1>
          <p className="text-xs text-[#5F5E5A]">제{data.roundNo}회차</p>
        </div>
      </header>

      {/* 클라이언트 컴포넌트: 스텝 관리 */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        <SurveyClient token={token} />
      </div>
    </main>
  )
}
