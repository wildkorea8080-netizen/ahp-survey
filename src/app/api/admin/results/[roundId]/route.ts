import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await params

  try {
    const groupResult = await prisma.groupResult.findUnique({
      where: { roundId },
      include: { round: { include: { survey: true } } },
    })

    if (!groupResult) {
      return NextResponse.json(
        { error: '분석 결과가 없습니다. 먼저 분석을 실행하세요.', code: 'NOT_FOUND', statusCode: 404 },
        { status: 404 }
      )
    }

    return NextResponse.json(groupResult)
  } catch {
    return NextResponse.json(
      { error: '서버 오류', code: 'INTERNAL_ERROR', statusCode: 500 },
      { status: 500 }
    )
  }
}
