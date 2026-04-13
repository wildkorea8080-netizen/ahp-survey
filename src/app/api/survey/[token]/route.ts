import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const round = await prisma.surveyRound.findUnique({
      where: { token },
      include: { survey: { select: { title: true } } },
    })

    if (!round) {
      return NextResponse.json(
        { error: '존재하지 않는 설문입니다', code: 'NOT_FOUND', statusCode: 404 },
        { status: 404 }
      )
    }

    return NextResponse.json({
      surveyTitle: round.survey.title,
      roundNo: round.roundNo,
      isOpen: round.status === 'OPEN',
    })
  } catch {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', code: 'INTERNAL_ERROR', statusCode: 500 },
      { status: 500 }
    )
  }
}
