import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { runGroupAnalysis } from '@/services/analysis.service'

const Schema = z.object({
  roundToken: z.string().default('haenong-2026-r1'),
  mode: z.enum(['4items', '3items']),
  crThreshold: z.number().min(0).max(1).default(0.1),
  includeAdjusted: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Schema>
  try {
    body = Schema.parse(await req.json())
  } catch {
    return NextResponse.json(
      { error: '입력값 오류', code: 'VALIDATION_ERROR', statusCode: 400 },
      { status: 400 }
    )
  }

  try {
    const round = await prisma.surveyRound.findUnique({
      where: { token: body.roundToken },
    })
    if (!round) {
      return NextResponse.json(
        { error: '설문 회차를 찾을 수 없습니다', code: 'NOT_FOUND', statusCode: 404 },
        { status: 404 }
      )
    }

    const groupResult = await runGroupAnalysis(round.id, body.crThreshold, body.includeAdjusted)

    // mode에 따라 반환 데이터 선택
    const geoMeanMatrix = (groupResult.geoMeanMatrix as { matrix4: number[][]; matrix3: number[][] })
    const is4 = body.mode === '4items'

    const weights = is4
      ? (groupResult.weights4 as number[])
      : (groupResult.weights3 as number[])
    const groupCr = is4 ? groupResult.groupCr4 : groupResult.groupCr3
    const matrix = is4 ? geoMeanMatrix.matrix4 : geoMeanMatrix.matrix3

    const score200 = weights.map((w) => Math.round(w * 200 * 100) / 100)
    const score300 = weights.map((w) => Math.round(w * 300 * 100) / 100)

    return NextResponse.json({
      roundId: round.id,
      validCount: groupResult.validCount,
      geoMeanMatrix: matrix,
      weights,
      groupCr,
      isValid: groupCr <= 0.1,
      score200,
      score300,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '분석 실패'
    return NextResponse.json(
      { error: msg, code: 'ANALYZE_ERROR', statusCode: 500 },
      { status: 500 }
    )
  }
}
