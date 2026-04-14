import { notFound } from 'next/navigation'
import SurveyClient from './SurveyClient'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function SurveyPage({ params }: Props) {
  const { token } = await params

  let round
  try {
    round = await prisma.surveyRound.findUnique({
      where: { token },
      include: { survey: true },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-lg rounded-lg border border-red-300 bg-red-50 p-6 text-sm text-red-800">
          <p className="font-bold mb-2">DB 연결 오류</p>
          <pre className="whitespace-pre-wrap break-all">{msg}</pre>
        </div>
      </main>
    )
  }

  if (!round) return notFound()

  const isOpen = round.status === 'OPEN'

  if (!isOpen) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-bold text-[#1F497D]">{round.survey.title}</h1>
          <p className="text-[#5F5E5A]">이 설문은 마감되었습니다.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <p className="text-xs text-[#5F5E5A]">{process.env.NEXT_PUBLIC_ORG_NAME}</p>
          <h1 className="text-base font-bold text-[#1F497D]">{round.survey.title}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <SurveyClient token={token} />
      </div>
    </main>
  )
}
