import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

async function getDashboardData() {
  const round = await prisma.surveyRound.findFirst({
    where: { token: 'haenong-2026-r1' },
    include: {
      survey: true,
      respondents: {
        where: { isLocked: true },
        include: { result: true },
        orderBy: { submittedAt: 'desc' },
      },
    },
  })
  return round
}

export default async function AdminDashboard() {
  const round = await getDashboardData()

  if (!round) {
    return <p className="text-[#C62828]">설문 회차를 찾을 수 없습니다.</p>
  }

  const respondents = round.respondents
  const total = respondents.length
  const target = round.targetCount
  const crValid = respondents.filter((r) => r.result?.isValid).length
  const crInvalid = total - crValid
  const progress = target > 0 ? Math.min((total / target) * 100, 100) : 0
  const recent5 = respondents.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1F497D]">{round.survey.title}</h1>
        <p className="text-sm text-[#5F5E5A]">제{round.roundNo}회차 · 토큰: {round.token}</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="전체 응답" value={total} color="#1F497D" />
        <StatCard label="CR 허용" value={crValid} color="#1B5E20" />
        <StatCard label="CR 초과" value={crInvalid} color="#C62828" />
        <StatCard label="목표 달성" value={`${total}/${target}`} color="#854F0B" />
      </div>

      {/* 목표 진행률 */}
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-[#1F497D]">목표 진행률</span>
          <span className="text-[#5F5E5A]">{total} / {target}명 ({Math.round(progress)}%)</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* 최근 응답자 */}
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-[#1F497D]">최근 응답자</h2>
          <Link href="/admin/responses" className="text-sm text-[#1F497D] underline">
            전체 보기 →
          </Link>
        </div>
        {recent5.length === 0 ? (
          <p className="text-sm text-[#5F5E5A]">아직 응답이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[#5F5E5A]">
                <th className="pb-2">성명</th>
                <th className="pb-2">소속</th>
                <th className="pb-2">구분</th>
                <th className="pb-2">4개CR</th>
                <th className="pb-2">제출시간</th>
              </tr>
            </thead>
            <tbody>
              {recent5.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{r.name}</td>
                  <td className="py-2 text-[#5F5E5A]">{r.organization}</td>
                  <td className="py-2 text-[#5F5E5A] text-xs">{r.category}</td>
                  <td className="py-2">
                    {r.result ? (
                      <CRBadge cr={r.result.cr} isValid={r.result.isValid} />
                    ) : '—'}
                  </td>
                  <td className="py-2 text-xs text-[#5F5E5A]">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleString('ko-KR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 분석 실행 버튼 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/admin/analysis?tab=4items"
          className="flex items-center justify-center gap-2 rounded-lg bg-[#1F497D] px-6 py-4 text-center text-white hover:bg-[#17375E] transition-colors"
        >
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-bold">4개 항목 분석 실행</p>
            <p className="text-xs text-blue-200">투자규모·영농규모·영농기간·반입기여도</p>
          </div>
        </Link>
        <Link
          href="/admin/analysis?tab=3items"
          className="flex items-center justify-center gap-2 rounded-lg bg-[#1B5E20] px-6 py-4 text-center text-white hover:bg-[#145218] transition-colors"
        >
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-bold">3개 항목 분석 실행</p>
            <p className="text-xs text-green-200">영농규모·영농기간·반입기여도</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs text-[#5F5E5A]">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

function CRBadge({ cr, isValid }: { cr: number; isValid: boolean }) {
  return (
    <Badge
      className="text-xs text-white"
      style={{ backgroundColor: isValid ? '#1B5E20' : '#C62828' }}
    >
      {cr.toFixed(3)} {isValid ? '✅' : '⚠'}
    </Badge>
  )
}
