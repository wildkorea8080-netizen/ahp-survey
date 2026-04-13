import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const roundToken = searchParams.get('roundToken') ?? 'haenong-2026-r1'
  const crFilterParam = searchParams.get('crFilter')
  const crFilter = crFilterParam ? parseFloat(crFilterParam) : undefined

  const round = await prisma.surveyRound.findUnique({
    where: { token: roundToken },
    include: {
      respondents: {
        where: { isLocked: true },
        include: {
          result: { include: { adjustment: true } },
        },
        orderBy: { submittedAt: 'asc' },
      },
    },
  })

  if (!round) {
    return NextResponse.json(
      { error: '설문 회차를 찾을 수 없습니다', code: 'NOT_FOUND', statusCode: 404 },
      { status: 404 }
    )
  }

  let respondents = round.respondents

  if (crFilter !== undefined) {
    respondents = respondents.filter((r) => {
      if (!r.result) return false
      const cr = r.result.adjustment?.useAdjusted
        ? (r.result.adjustment.adjustedCr ?? r.result.cr)
        : r.result.cr
      return cr <= crFilter
    })
  }

  // 직렬화 (Date → string)
  const rows = respondents.map((r) => ({
    id: r.id,
    name: r.name,
    organization: r.organization,
    category: r.category,
    submittedAt: r.submittedAt,
    result: r.result
      ? {
          id: r.result.id,
          cr: r.result.cr,
          isValid: r.result.isValid,
          weights: r.result.weights,
          adjustment: r.result.adjustment
            ? {
                adjustedCr: r.result.adjustment.adjustedCr,
                useAdjusted: r.result.adjustment.useAdjusted,
                changedQuestions: r.result.adjustment.changedQuestions as string[],
              }
            : null,
        }
      : null,
  }))

  return NextResponse.json({ roundId: round.id, respondents: rows })
}
