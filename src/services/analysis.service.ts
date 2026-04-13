/**
 * 분석 서비스 레이어
 * CLAUDE.md 절대 원칙 #6: 비즈니스 로직은 서비스 레이어에 분리
 */

import { prisma } from '@/lib/prisma'
import { analyzeAHP4, analyzeAHP3, calcGroupMatrix } from '@/lib/ahp/calculator'
import { adjustCR } from '@/lib/ahp/adjuster'
import type { GroupResult, IndividualResult, Respondent, CRAdjustment } from '@prisma/client'

export type ResponseWithResult = Respondent & {
  result: (IndividualResult & { adjustment: CRAdjustment | null }) | null
  _cr3?: number  // 3개 항목 CR (weights JSON에서 추출)
}

/** 응답자 목록 조회 (CR 필터 포함) */
export async function getResponses(
  roundId: string,
  crFilter?: number
): Promise<ResponseWithResult[]> {
  const respondents = await prisma.respondent.findMany({
    where: { roundId, isLocked: true },
    include: {
      result: { include: { adjustment: true } },
    },
    orderBy: { submittedAt: 'asc' },
  })

  if (crFilter === undefined) return respondents

  // CR 필터: 4개 항목 CR 기준
  return respondents.filter((r) => {
    if (!r.result) return false
    const cr = r.result.adjustment?.useAdjusted
      ? (r.result.adjustment.adjustedCr ?? r.result.cr)
      : r.result.cr
    return cr <= crFilter
  }) as ResponseWithResult[]
}

/** 집단 분석 실행 및 GroupResult 저장 */
export async function runGroupAnalysis(
  roundId: string,
  crThreshold: number,
  includeAdjusted: boolean
): Promise<GroupResult> {
  // 유효 응답자 조회 (제출 완료 + CR 기준 통과)
  const respondents = await prisma.respondent.findMany({
    where: { roundId, isLocked: true },
    include: {
      answers: { orderBy: { questionCode: 'asc' } },
      result: { include: { adjustment: true } },
    },
  })

  // 유효 응답자 필터링
  const validRespondents = respondents.filter((r) => {
    if (!r.result) return false
    if (includeAdjusted && r.result.adjustment?.useAdjusted) return true
    return r.result.cr <= crThreshold
  })

  if (validRespondents.length === 0) {
    throw new Error('유효 응답자가 없습니다')
  }

  // 각 응답자의 행렬 수집 (보정값 적용 여부 반영)
  const matrices4: number[][][] = []
  const matrices3: number[][][] = []

  for (const r of validRespondents) {
    let answers = r.answers.map((a) => ({
      questionCode: a.questionCode,
      rawValue: a.rawValue,
    }))

    // 보정값 적용 (원본 불변 — 복사본 사용)
    if (includeAdjusted && r.result?.adjustment?.useAdjusted) {
      const adj = r.result.adjustment.adjustedAnswers as {
        questionCode: string
        rawValue: number
      }[]
      answers = answers.map((a) => {
        const override = adj.find((x) => x.questionCode === a.questionCode)
        return override ?? a
      })
    }

    const result4 = analyzeAHP4(answers)
    const result3 = analyzeAHP3(answers)
    matrices4.push(result4.matrix)
    matrices3.push(result3.matrix)
  }

  // 집단 기하평균 행렬 계산
  const groupMatrix4 = calcGroupMatrix(matrices4)
  const groupMatrix3 = calcGroupMatrix(matrices3)

  // 집단 행렬로 AHP 계산
  // buildMatrix 대신 직접 행렬을 사용하는 헬퍼
  const groupResult4 = analyzeMatrixDirect(groupMatrix4, 4)
  const groupResult3 = analyzeMatrixDirect(groupMatrix3, 3)

  // GroupResult upsert
  const groupResult = await prisma.groupResult.upsert({
    where: { roundId },
    create: {
      roundId,
      validCount: validRespondents.length,
      geoMeanMatrix: { matrix4: groupMatrix4, matrix3: groupMatrix3 },
      weights4: groupResult4.weights,
      weights3: groupResult3.weights,
      groupCr4: groupResult4.cr,
      groupCr3: groupResult3.cr,
    },
    update: {
      validCount: validRespondents.length,
      geoMeanMatrix: { matrix4: groupMatrix4, matrix3: groupMatrix3 },
      weights4: groupResult4.weights,
      weights3: groupResult3.weights,
      groupCr4: groupResult4.cr,
      groupCr3: groupResult3.cr,
      calculatedAt: new Date(),
    },
  })

  return groupResult
}

/** 개별 응답자 CR 보정 실행 및 저장 */
export async function runAdjustment(respondentId: string) {
  const respondent = await prisma.respondent.findUnique({
    where: { id: respondentId },
    include: {
      answers: true,
      result: { include: { adjustment: true } },
    },
  })

  if (!respondent) throw new Error('응답자를 찾을 수 없습니다')
  if (!respondent.result) throw new Error('분석 결과가 없습니다')

  const answers = respondent.answers.map((a) => ({
    questionCode: a.questionCode,
    rawValue: a.rawValue,  // 원본 rawValue 사용 (불변)
  }))

  const adjResult = adjustCR(answers)

  // CRAdjustment upsert (원본 복사본 저장, 절대 불변)
  await prisma.cRAdjustment.upsert({
    where: { resultId: respondent.result.id },
    create: {
      resultId: respondent.result.id,
      originalAnswers: adjResult.originalAnswers,
      adjustedAnswers: adjResult.adjustedAnswers,
      adjustedWeights: adjResult.adjustedResult.weights,
      adjustedCr: adjResult.adjustedResult.cr,
      useAdjusted: false,  // 기본값: 원본 사용
      changedQuestions: adjResult.changedQuestions,
    },
    update: {
      originalAnswers: adjResult.originalAnswers,
      adjustedAnswers: adjResult.adjustedAnswers,
      adjustedWeights: adjResult.adjustedResult.weights,
      adjustedCr: adjResult.adjustedResult.cr,
      changedQuestions: adjResult.changedQuestions,
      adjustedAt: new Date(),
    },
  })

  return adjResult
}

// ── 내부 헬퍼: 기존 행렬로 직접 AHP 계산 ──────────────────────────
import {
  normalizeMatrix,
  calcWeights,
  calcLambdaMax,
  calcCI,
  calcCR,
} from '@/lib/ahp/calculator'

function analyzeMatrixDirect(matrix: number[][], n: number) {
  const normalized = normalizeMatrix(matrix)
  const weights = calcWeights(normalized)
  const lambdaMax = calcLambdaMax(matrix, weights)
  const ci = calcCI(lambdaMax, n)
  const cr = calcCR(ci, n)
  return { weights, lambdaMax, ci, cr, isValid: cr <= 0.1 }
}
