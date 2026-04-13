import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const Schema = z.object({
  respondentId: z.string().min(1),
  useAdjusted: z.boolean(),
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
    // IndividualResult → CRAdjustment useAdjusted 업데이트만
    // 원본 Answer 절대 불변 (CLAUDE.md 절대 원칙 #1, #2)
    const result = await prisma.individualResult.findUnique({
      where: { respondentId: body.respondentId },
      include: { adjustment: true },
    })

    if (!result?.adjustment) {
      return NextResponse.json(
        { error: '보정 데이터가 없습니다. 먼저 보정을 실행하세요.', code: 'NOT_FOUND', statusCode: 404 },
        { status: 404 }
      )
    }

    await prisma.cRAdjustment.update({
      where: { resultId: result.id },
      data: { useAdjusted: body.useAdjusted },
    })

    return NextResponse.json({ ok: true, useAdjusted: body.useAdjusted })
  } catch {
    return NextResponse.json(
      { error: '적용 중 오류', code: 'INTERNAL_ERROR', statusCode: 500 },
      { status: 500 }
    )
  }
}
