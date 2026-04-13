import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runAdjustment } from '@/services/analysis.service'

const Schema = z.object({ respondentId: z.string().min(1) })

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
    const result = await runAdjustment(body.respondentId)
    return NextResponse.json({
      originalCr: result.originalResult.cr,
      adjustedCr: result.adjustedResult.cr,
      success: result.success,
      iterations: result.iterations,
      changedQuestions: result.changedQuestions,
      originalAnswers: result.originalAnswers,
      adjustedAnswers: result.adjustedAnswers,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '보정 실패'
    return NextResponse.json(
      { error: msg, code: 'ADJUST_ERROR', statusCode: 500 },
      { status: 500 }
    )
  }
}
