/**
 * CR 보정 알고리즘
 * CLAUDE.md 절대 원칙 #1, #2:
 *   - 원본 Answer 데이터 절대 수정 금지
 *   - 보정값은 CRAdjustment 테이블에만 저장
 *   - 이 파일은 복사본(메모리)에서만 작업
 *
 * AHP_SPEC.md CR 보정 알고리즘:
 *   1. 각 문항 ±1 조정 시 CR 변화 시뮬레이션
 *   2. CR 개선 최대 문항 선택
 *   3. CR ≤ 0.1 달성까지 반복 (최대 10회)
 *   4. 원본 Answer 절대 불변 — 복사본에서만 작업
 */

import { analyzeAHP4, AHPResult } from './calculator'

type AnswerInput = { questionCode: string; rawValue: number }

export interface AdjustmentResult {
  /** 원본 답변 (절대 불변) */
  originalAnswers: AnswerInput[]
  /** 보정된 답변 */
  adjustedAnswers: AnswerInput[]
  /** 원본 AHP 계산 결과 */
  originalResult: AHPResult
  /** 보정 후 AHP 계산 결과 */
  adjustedResult: AHPResult
  /** 변경된 문항 코드 목록 */
  changedQuestions: string[]
  /** 실제 반복 횟수 */
  iterations: number
  /** CR ≤ 0.1 달성 여부 */
  success: boolean
}

/**
 * rawValue 유효 범위 체크
 * 양수: 1~9 (A가 B보다 중요)
 * 0: 동등
 * 음수: -9~-1 (B가 A보다 중요)
 */
function isValidRaw(raw: number): boolean {
  return raw >= -9 && raw <= 9
}

/**
 * 한 step에서 CR을 가장 많이 낮추는 문항과 조정값 탐색
 * 모든 문항의 rawValue ±1을 시뮬레이션
 * @returns { code, value, cr } | null (개선 불가)
 */
function findBestStep(
  current: AnswerInput[],
  currentCR: number
): { code: string; value: number; cr: number } | null {
  let bestCR = currentCR
  let bestCode = ''
  let bestValue = 0
  let found = false

  for (const answer of current) {
    for (const delta of [-1, 1]) {
      const newRaw = answer.rawValue + delta

      if (!isValidRaw(newRaw)) continue

      const trial = current.map((a) =>
        a.questionCode === answer.questionCode
          ? { ...a, rawValue: newRaw }
          : { ...a }
      )
      const trialResult = analyzeAHP4(trial)

      if (trialResult.cr < bestCR) {
        bestCR = trialResult.cr
        bestCode = answer.questionCode
        bestValue = newRaw
        found = true
      }
    }
  }

  return found ? { code: bestCode, value: bestValue, cr: bestCR } : null
}

/**
 * CR 보정 실행
 *
 * - analyzeAHP4 기준으로 보정 (4개 항목 전체 일관성)
 * - 원본 answers를 절대 수정하지 않고 deep copy에서만 작업
 * - 최대 10회 반복
 * - 더 이상 개선 불가능하면 조기 종료
 */
export function adjustCR(answers: AnswerInput[]): AdjustmentResult {
  // 원본 deep copy (불변 보장)
  const originalAnswers: AnswerInput[] = answers.map((a) => ({ ...a }))
  const originalResult = analyzeAHP4(originalAnswers)

  // 이미 유효하면 그대로 반환
  if (originalResult.cr <= 0.1) {
    return {
      originalAnswers,
      adjustedAnswers: originalAnswers.map((a) => ({ ...a })),
      originalResult,
      adjustedResult: originalResult,
      changedQuestions: [],
      iterations: 0,
      success: true,
    }
  }

  // 보정 작업용 복사본
  let current: AnswerInput[] = originalAnswers.map((a) => ({ ...a }))
  const changedSet = new Set<string>()
  let iterations = 0
  let currentResult = analyzeAHP4(current)

  while (currentResult.cr > 0.1 && iterations < 10) {
    iterations++

    const best = findBestStep(current, currentResult.cr)
    if (!best) break  // 더 이상 개선 불가

    // 최선의 조정 적용
    current = current.map((a) =>
      a.questionCode === best.code ? { ...a, rawValue: best.value } : { ...a }
    )
    changedSet.add(best.code)
    currentResult = analyzeAHP4(current)
  }

  return {
    originalAnswers,
    adjustedAnswers: current,
    originalResult,
    adjustedResult: currentResult,
    changedQuestions: [...changedSet],
    iterations,
    success: currentResult.cr <= 0.1,
  }
}
