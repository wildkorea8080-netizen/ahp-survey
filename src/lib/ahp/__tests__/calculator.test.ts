/**
 * AHP 수학 엔진 테스트
 *
 * 검증 기준값 (T1, T2):
 *   Q1=3, Q2=5, Q3=7, Q4=2, Q5=3, Q6=2 로 직접 계산한 결과
 *   행렬:
 *     inv  [1,    3,   5,   7 ]
 *     farm [1/3,  1,   2,   3 ]
 *     per  [1/5, 1/2,  1,   2 ]
 *     imp  [1/7, 1/3, 1/2,  1 ]
 *   가중치: inv≈0.586, farm≈0.218, per≈0.124, imp≈0.073
 *   CR ≈ 0.008 → isValid=true
 *
 * T3~T5용 불일관 케이스:
 *   기준 응답에서 Q3만 7→2로 교체
 *   Q1=3, Q2=5, Q3=2, Q4=2, Q5=3, Q6=2
 *   Q1*Q5=9(inv/imp 추론값) ≠ Q3=2 → CR > 0.1 보장
 *   greedy ±1로 Q3을 2→7 복원 → 5회 이내 수렴 보장
 */

import {
  toMatrixValue,
  buildMatrix,
  normalizeMatrix,
  calcWeights,
  calcLambdaMax,
  calcCI,
  calcCR,
  calcGroupMatrix,
  analyzeAHP4,
  analyzeAHP3,
  PAIRS4,
  PAIRS3,
  ITEMS4,
  ITEMS3,
  RI,
} from '../calculator'
import { adjustCR } from '../adjuster'

// ── 검증용 기준 응답 ───────────────────────────────────────────────

/** 높은 일관성 (CR ≈ 0.008) — 기준 응답 */
const CONSISTENT_ANSWERS = [
  { questionCode: 'Q1', rawValue: 3 },  // inv > farm (3배)
  { questionCode: 'Q2', rawValue: 5 },  // inv > per  (5배)
  { questionCode: 'Q3', rawValue: 7 },  // inv > imp  (7배)
  { questionCode: 'Q4', rawValue: 2 },  // farm > per (2배)
  { questionCode: 'Q5', rawValue: 3 },  // farm > imp (3배)
  { questionCode: 'Q6', rawValue: 2 },  // per > imp  (2배)
]

/**
 * 낮은 일관성 (CR > 0.1) — Q3만 7→2로 교체한 모순 응답
 * Q1*Q5=3*3=9배 (inv/imp 추론) ≠ Q3=2 (직접 비교) → 명확한 모순
 * ±1 greedy로 Q3을 5회 증가시키면 CR ≤ 0.1 달성
 */
const INCONSISTENT_ANSWERS = [
  { questionCode: 'Q1', rawValue: 3 },
  { questionCode: 'Q2', rawValue: 5 },
  { questionCode: 'Q3', rawValue: 2 },  // 일관값은 7, 2로 낮춰 모순 생성
  { questionCode: 'Q4', rawValue: 2 },
  { questionCode: 'Q5', rawValue: 3 },
  { questionCode: 'Q6', rawValue: 2 },
]

// ── T1: 알려진 응답값 → 예상 가중치 범위 검증 ─────────────────────
describe('T1: 알려진 응답값 → 가중치 범위 검증', () => {
  const result = analyzeAHP4(CONSISTENT_ANSWERS)

  test('가중치 합 ≈ 1.0', () => {
    const sum = result.weights.reduce((s, w) => s + w, 0)
    expect(sum).toBeCloseTo(1.0, 5)
  })

  test('inv(투자규모) 가중치 ≈ 0.57~0.60', () => {
    expect(result.weights[0]).toBeGreaterThan(0.57)
    expect(result.weights[0]).toBeLessThan(0.60)
  })

  test('farm(영농규모) 가중치 ≈ 0.21~0.23', () => {
    expect(result.weights[1]).toBeGreaterThan(0.21)
    expect(result.weights[1]).toBeLessThan(0.23)
  })

  test('per(영농기간) 가중치 ≈ 0.11~0.14', () => {
    expect(result.weights[2]).toBeGreaterThan(0.11)
    expect(result.weights[2]).toBeLessThan(0.14)
  })

  test('imp(반입기여도) 가중치 ≈ 0.06~0.09', () => {
    expect(result.weights[3]).toBeGreaterThan(0.06)
    expect(result.weights[3]).toBeLessThan(0.09)
  })

  test('순위: inv(1위) > farm(2위) > per(3위) > imp(4위)', () => {
    expect(result.ranks[0]).toBe(1)  // inv
    expect(result.ranks[1]).toBe(2)  // farm
    expect(result.ranks[2]).toBe(3)  // per
    expect(result.ranks[3]).toBe(4)  // imp
  })

  test('weightMap 키가 item key와 일치', () => {
    expect(result.weightMap).toHaveProperty('inv')
    expect(result.weightMap).toHaveProperty('farm')
    expect(result.weightMap).toHaveProperty('per')
    expect(result.weightMap).toHaveProperty('imp')
    expect(result.weightMap['inv']).toBeCloseTo(result.weights[0], 10)
  })

  test('score200: 4개 항목 합 ≈ 200', () => {
    const sum = result.score200.reduce((s, v) => s + v, 0)
    expect(sum).toBeCloseTo(200, 0)
  })

  test('score300: 4개 항목 합 ≈ 300', () => {
    const sum = result.score300.reduce((s, v) => s + v, 0)
    expect(sum).toBeCloseTo(300, 0)
  })
})

// ── T2: CR ≤ 0.1 응답 → isValid=true ─────────────────────────────
describe('T2: CR ≤ 0.1 응답 → isValid=true', () => {
  const result = analyzeAHP4(CONSISTENT_ANSWERS)

  test('CR ≤ 0.1', () => {
    expect(result.cr).toBeLessThanOrEqual(0.1)
  })

  test('isValid = true', () => {
    expect(result.isValid).toBe(true)
  })

  test('CR ≈ 0.008 (계산 정확도 검증)', () => {
    expect(result.cr).toBeGreaterThanOrEqual(0)
    expect(result.cr).toBeLessThan(0.02)
  })

  test('λmax > n (완전 일관은 λmax=n)', () => {
    expect(result.lambdaMax).toBeGreaterThanOrEqual(result.n)
  })
})

// ── T3: CR > 0.1 응답 → isValid=false ────────────────────────────
describe('T3: CR > 0.1 모순 응답 → isValid=false', () => {
  const result = analyzeAHP4(INCONSISTENT_ANSWERS)

  test('CR > 0.1', () => {
    expect(result.cr).toBeGreaterThan(0.1)
  })

  test('isValid = false', () => {
    expect(result.isValid).toBe(false)
  })
})

// ── T4: adjustCR → adjustedResult.cr ≤ 0.1 ───────────────────────
describe('T4: adjustCR → 보정 후 CR ≤ 0.1', () => {
  const adj = adjustCR(INCONSISTENT_ANSWERS)

  test('success = true (최대 10회 내 달성)', () => {
    expect(adj.success).toBe(true)
  })

  test('adjustedResult.cr ≤ 0.1', () => {
    expect(adj.adjustedResult.cr).toBeLessThanOrEqual(0.1)
  })

  test('adjustedResult.isValid = true', () => {
    expect(adj.adjustedResult.isValid).toBe(true)
  })

  test('iterations > 0 (실제 보정이 필요했음)', () => {
    expect(adj.iterations).toBeGreaterThan(0)
  })

  test('iterations ≤ 10 (최대 반복 횟수 초과 안 함)', () => {
    expect(adj.iterations).toBeLessThanOrEqual(10)
  })

  test('changedQuestions가 배열이며 최소 1개 이상', () => {
    expect(Array.isArray(adj.changedQuestions)).toBe(true)
    expect(adj.changedQuestions.length).toBeGreaterThan(0)
  })
})

// ── T5: 원본 불변 — adjustCR 후 originalAnswers 변경 없음 ──────────
describe('T5: 원본 불변 검증', () => {
  const original = INCONSISTENT_ANSWERS.map((a) => ({ ...a }))
  const adj = adjustCR(INCONSISTENT_ANSWERS)

  test('adj.originalAnswers가 입력값과 동일', () => {
    original.forEach((a, i) => {
      expect(adj.originalAnswers[i].questionCode).toBe(a.questionCode)
      expect(adj.originalAnswers[i].rawValue).toBe(a.rawValue)
    })
  })

  test('adj.originalAnswers !== adj.adjustedAnswers (참조 분리)', () => {
    // 객체 참조가 다름 (deep copy)
    expect(adj.originalAnswers).not.toBe(adj.adjustedAnswers)
  })

  test('originalResult.cr > 0.1 (원본은 변하지 않음)', () => {
    expect(adj.originalResult.cr).toBeGreaterThan(0.1)
  })

  test('보정 성공 시 adjustedAnswers는 originalAnswers와 다름', () => {
    if (adj.success) {
      const changed = adj.adjustedAnswers.some(
        (a, i) => a.rawValue !== adj.originalAnswers[i].rawValue
      )
      expect(changed).toBe(true)
    }
  })
})

// ── T6: analyzeAHP3 → items.length===3, PAIRS3만 사용 ─────────────
describe('T6: analyzeAHP3 — 3개 항목 검증', () => {
  const result3 = analyzeAHP3(CONSISTENT_ANSWERS)

  test('items.length === 3', () => {
    expect(result3.items.length).toBe(3)
  })

  test('n === 3', () => {
    expect(result3.n).toBe(3)
  })

  test('items 키: farm, per, imp (투자규모 없음)', () => {
    const keys = result3.items.map((i) => i.key)
    expect(keys).toContain('farm')
    expect(keys).toContain('per')
    expect(keys).toContain('imp')
    expect(keys).not.toContain('inv')
  })

  test('weights.length === 3', () => {
    expect(result3.weights.length).toBe(3)
  })

  test('3개 항목 가중치 합 ≈ 1.0', () => {
    const sum = result3.weights.reduce((s, w) => s + w, 0)
    expect(sum).toBeCloseTo(1.0, 5)
  })

  test('matrix 크기 3×3', () => {
    expect(result3.matrix.length).toBe(3)
    result3.matrix.forEach((row) => expect(row.length).toBe(3))
  })

  test('RI[3] = 0.58 사용', () => {
    expect(RI[3]).toBe(0.58)
  })

  test('analyzeAHP4와 analyzeAHP3의 CR은 독립적으로 계산됨', () => {
    const result4 = analyzeAHP4(CONSISTENT_ANSWERS)
    // 같을 수도 다를 수도 있으나 둘 다 유효한 값이어야 함
    expect(result4.cr).toBeGreaterThanOrEqual(0)
    expect(result3.cr).toBeGreaterThanOrEqual(0)
  })
})

// ── T7: 집단 행렬 기하평균 검증 ────────────────────────────────────
describe('T7: calcGroupMatrix — 기하평균 검증', () => {
  test('2개 행렬의 기하평균 정확도', () => {
    // 2×2 단순 예시: m1[0][1]=2, m2[0][1]=8 → 기하평균 = √(2×8) = 4
    const m1 = [
      [1, 2],
      [0.5, 1],
    ]
    const m2 = [
      [1, 8],
      [0.125, 1],
    ]
    const group = calcGroupMatrix([m1, m2])
    expect(group[0][1]).toBeCloseTo(4, 5)
    expect(group[1][0]).toBeCloseTo(1 / 4, 5)
  })

  test('대각 원소는 항상 1', () => {
    const m1 = [[1, 3], [1 / 3, 1]]
    const m2 = [[1, 5], [1 / 5, 1]]
    const group = calcGroupMatrix([m1, m2])
    expect(group[0][0]).toBe(1)
    expect(group[1][1]).toBe(1)
  })

  test('3개 행렬 기하평균: (2×4×8)^(1/3) = (64)^(1/3) = 4', () => {
    const make = (v: number) => [[1, v], [1 / v, 1]]
    const group = calcGroupMatrix([make(2), make(4), make(8)])
    expect(group[0][1]).toBeCloseTo(4, 5)
  })

  test('단일 행렬 기하평균 = 원본', () => {
    const m = [[1, 3, 5], [1 / 3, 1, 2], [1 / 5, 0.5, 1]]
    const group = calcGroupMatrix([m])
    expect(group[0][1]).toBeCloseTo(3, 10)
    expect(group[0][2]).toBeCloseTo(5, 10)
    expect(group[1][2]).toBeCloseTo(2, 10)
  })

  test('calcGroupMatrix로 구한 행렬로 AHP 계산 가능', () => {
    const a1 = CONSISTENT_ANSWERS
    const a2 = [
      { questionCode: 'Q1', rawValue: 2 },
      { questionCode: 'Q2', rawValue: 4 },
      { questionCode: 'Q3', rawValue: 6 },
      { questionCode: 'Q4', rawValue: 2 },
      { questionCode: 'Q5', rawValue: 3 },
      { questionCode: 'Q6', rawValue: 2 },
    ]
    const { matrix: m1 } = analyzeAHP4(a1)
    const { matrix: m2 } = analyzeAHP4(a2)
    const group = calcGroupMatrix([m1, m2])

    // 집단 행렬도 역수 관계 유지
    expect(group[0][1] * group[1][0]).toBeCloseTo(1, 5)
    expect(group[0][2] * group[2][0]).toBeCloseTo(1, 5)
  })
})

// ── 보조: toMatrixValue 단위 테스트 ───────────────────────────────
describe('toMatrixValue 단위 테스트', () => {
  test('rawValue=0 → 1 (동등)', () => expect(toMatrixValue(0)).toBe(1))
  test('rawValue=3 → 3', () => expect(toMatrixValue(3)).toBe(3))
  test('rawValue=9 → 9', () => expect(toMatrixValue(9)).toBe(9))
  test('rawValue=-3 → 1/3', () => expect(toMatrixValue(-3)).toBeCloseTo(1 / 3, 10))
  test('rawValue=-9 → 1/9', () => expect(toMatrixValue(-9)).toBeCloseTo(1 / 9, 10))
  test('rawValue=1 → 1', () => expect(toMatrixValue(1)).toBe(1))
  test('rawValue=-1 → 1', () => expect(toMatrixValue(-1)).toBe(1))
})

// ── 보조: buildMatrix 단위 테스트 ─────────────────────────────────
describe('buildMatrix 단위 테스트', () => {
  test('대각 원소 = 1', () => {
    const m = buildMatrix(CONSISTENT_ANSWERS, PAIRS4, 4)
    for (let i = 0; i < 4; i++) {
      expect(m[i][i]).toBe(1)
    }
  })

  test('역수 관계: m[a][b] * m[b][a] ≈ 1', () => {
    const m = buildMatrix(CONSISTENT_ANSWERS, PAIRS4, 4)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        expect(m[i][j] * m[j][i]).toBeCloseTo(1, 10)
      }
    }
  })

  test('Q1 rawValue=3 → matrix[0][1]=3, matrix[1][0]=1/3', () => {
    const m = buildMatrix(CONSISTENT_ANSWERS, PAIRS4, 4)
    expect(m[0][1]).toBe(3)
    expect(m[1][0]).toBeCloseTo(1 / 3, 10)
  })
})

// ── 보조: 상수 정의 검증 ──────────────────────────────────────────
describe('상수 정의 검증', () => {
  test('ITEMS4.length === 4', () => expect(ITEMS4.length).toBe(4))
  test('ITEMS3.length === 3', () => expect(ITEMS3.length).toBe(3))
  test('PAIRS4.length === 6', () => expect(PAIRS4.length).toBe(6))
  test('PAIRS3.length === 3', () => expect(PAIRS3.length).toBe(3))
  test('ITEMS4[0].key === inv', () => expect(ITEMS4[0].key).toBe('inv'))
  test('ITEMS3[0].key === farm (투자규모 없음)', () => expect(ITEMS3[0].key).toBe('farm'))
  test('PAIRS3 codes는 Q4, Q5, Q6', () => {
    const codes = PAIRS3.map((p) => p.code)
    expect(codes).toEqual(['Q4', 'Q5', 'Q6'])
  })
  test('RI[4] === 0.90', () => expect(RI[4]).toBe(0.90))
  test('RI[3] === 0.58', () => expect(RI[3]).toBe(0.58))
})
