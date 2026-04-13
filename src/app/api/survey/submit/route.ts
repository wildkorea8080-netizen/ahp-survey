import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { toMatrixValue, analyzeAHP4, analyzeAHP3 } from '@/lib/ahp/calculator'
import { generateDataHash } from '@/lib/hash/integrity'
import { RESPONDENT_CATEGORIES } from '@/types'

// ── zod 검증 스키마 ────────────────────────────────────────────────
const AnswerSchema = z.object({
  questionCode: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']),
  rawValue: z.number().int().min(-9).max(9),
})

const SubmitSchema = z.object({
  token: z.string().min(1),
  respondent: z.object({
    name: z.string().min(1).max(50),
    organization: z.string().min(1).max(100),
    position: z.string().min(1).max(50),
    category: z.enum(RESPONDENT_CATEGORIES as unknown as [string, ...string[]]),
  }),
  answers: z.array(AnswerSchema).length(6),
  signatureDataUrl: z.string().startsWith('data:image/'),
})

// PAIRS4 기준 itemA/itemB 이름 매핑
const PAIR_ITEMS: Record<string, { itemA: string; itemB: string }> = {
  Q1: { itemA: '투자규모', itemB: '영농규모' },
  Q2: { itemA: '투자규모', itemB: '영농기간' },
  Q3: { itemA: '투자규모', itemB: '반입기여도' },
  Q4: { itemA: '영농규모', itemB: '영농기간' },
  Q5: { itemA: '영농규모', itemB: '반입기여도' },
  Q6: { itemA: '영농기간', itemB: '반입기여도' },
}

function apiError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code, statusCode: status }, { status })
}

export async function POST(req: NextRequest) {
  // 1. zod 검증
  let body: z.infer<typeof SubmitSchema>
  try {
    const raw = await req.json() as unknown
    body = SubmitSchema.parse(raw)
  } catch {
    return apiError('입력값이 올바르지 않습니다', 'VALIDATION_ERROR', 400)
  }

  const { token, respondent, answers, signatureDataUrl } = body

  try {
    // 2. 토큰 → SurveyRound 조회
    const round = await prisma.surveyRound.findUnique({ where: { token } })
    if (!round) return apiError('존재하지 않는 설문입니다', 'NOT_FOUND', 404)
    if (round.status !== 'OPEN') return apiError('마감된 설문입니다', 'SURVEY_CLOSED', 403)

    // 3~10. 트랜잭션으로 일괄 처리
    const respondentId = await prisma.$transaction(async (tx) => {
      // 3. Respondent 저장
      const newRespondent = await tx.respondent.create({
        data: {
          roundId: round.id,
          name: respondent.name,
          organization: respondent.organization,
          position: respondent.position,
          category: respondent.category,
        },
      })

      // 중복 제출 방지: isLocked 확인은 트랜잭션 내에서
      // (신규 생성이므로 isLocked=false 기본값)

      // 4-5. Answer 저장 (rawValue → matrixValue 변환, 원본 rawValue 불변)
      await tx.answer.createMany({
        data: answers.map((a) => ({
          respondentId: newRespondent.id,
          questionCode: a.questionCode,
          itemA: PAIR_ITEMS[a.questionCode].itemA,
          itemB: PAIR_ITEMS[a.questionCode].itemB,
          rawValue: a.rawValue,
          matrixValue: toMatrixValue(a.rawValue),
        })),
      })

      // 6. AHP 계산 (4개 항목 + 3개 항목 독립 계산)
      const result4 = analyzeAHP4(answers)
      const result3 = analyzeAHP3(answers)

      // 7. IndividualResult 저장 (4개 항목 기준 CR 판정)
      await tx.individualResult.create({
        data: {
          respondentId: newRespondent.id,
          // weights4, weights3 모두 JSON에 포함
          weights: {
            weights4: result4.weights,
            weights3: result3.weights,
            weightMap4: result4.weightMap,
            weightMap3: result3.weightMap,
            score200_4: result4.score200,
            score300_4: result4.score300,
            score200_3: result3.score200,
            score300_3: result3.score300,
          },
          lambdaMax: result4.lambdaMax,
          ci: result4.ci,
          cr: result4.cr,
          isValid: result4.isValid,
        },
      })

      // 8. Signature 저장
      await tx.signature.create({
        data: {
          respondentId: newRespondent.id,
          imageData: signatureDataUrl,
          signedAt: new Date(),
        },
      })

      // 9. IP/UA/hash → SubmissionLog
      const ipAddress =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        'unknown'
      const userAgent = req.headers.get('user-agent') ?? 'unknown'
      const submittedAt = new Date()

      const dataHash = generateDataHash({
        respondentId: newRespondent.id,
        answers,
        submittedAt: submittedAt.toISOString(),
      })

      await tx.submissionLog.create({
        data: {
          respondentId: newRespondent.id,
          ipAddress,
          userAgent,
          submittedAt,
          dataHash,
        },
      })

      // 10. isLocked=true, submittedAt=now()
      await tx.respondent.update({
        where: { id: newRespondent.id },
        data: { isLocked: true, submittedAt },
      })

      return newRespondent.id
    })

    // 11. 응답 ID 반환
    return NextResponse.json({ respondentId })
  } catch (err) {
    console.error('[submit] error:', err)
    return apiError('서버 오류가 발생했습니다', 'INTERNAL_ERROR', 500)
  }
}
