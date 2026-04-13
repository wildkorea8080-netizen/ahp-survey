/**
 * AHP 수학 엔진
 * CLAUDE.md 절대 원칙 #4: 이 파일에서만 AHP 수학 계산 수행
 * AHP_SPEC.md 기준으로 구현
 */

// ── RI 테이블 (n=1,2는 CR 무의미 → 0) ─────────────────────────────
export const RI: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
}

// ── 평가항목 정의 (AHP_SPEC.md 순서 고정) ──────────────────────────
export interface ItemDef {
  key: string
  label: string  // 전체 명칭
  short: string  // 축약 (차트 레이블)
  color: string  // 텍스트/뱃지 색상
  bar: string    // 차트 바 색상
}

export const ITEMS4: readonly ItemDef[] = [
  { key: 'inv',  label: '투자규모',   short: '투자규모',   color: '#1F497D', bar: '#4472C4' },
  { key: 'farm', label: '영농규모',   short: '영농규모',   color: '#1B5E20', bar: '#70AD47' },
  { key: 'per',  label: '영농기간',   short: '영농기간',   color: '#854F0B', bar: '#ED7D31' },
  { key: 'imp',  label: '반입기여도', short: '반입기여도', color: '#C62828', bar: '#FF6B6B' },
] as const

/** 3개 항목: 투자규모 제외 (인덱스 0=영농규모, 1=영농기간, 2=반입기여도) */
export const ITEMS3: readonly ItemDef[] = ITEMS4.slice(1)

// ── 쌍대비교 문항 정의 (행렬 인덱스 기준) ─────────────────────────
interface PairDef {
  code: string
  a: number  // items 배열 내 인덱스
  b: number
}

/** 4개 항목용 6문항 — 인덱스: inv=0, farm=1, per=2, imp=3 */
export const PAIRS4: readonly PairDef[] = [
  { code: 'Q1', a: 0, b: 1 },  // 투자규모 vs 영농규모
  { code: 'Q2', a: 0, b: 2 },  // 투자규모 vs 영농기간
  { code: 'Q3', a: 0, b: 3 },  // 투자규모 vs 반입기여도
  { code: 'Q4', a: 1, b: 2 },  // 영농규모 vs 영농기간
  { code: 'Q5', a: 1, b: 3 },  // 영농규모 vs 반입기여도
  { code: 'Q6', a: 2, b: 3 },  // 영농기간 vs 반입기여도
] as const

/** 3개 항목용 3문항 — 인덱스 재매핑: farm=0, per=1, imp=2 */
export const PAIRS3: readonly PairDef[] = [
  { code: 'Q4', a: 0, b: 1 },  // 영농규모 vs 영농기간
  { code: 'Q5', a: 0, b: 2 },  // 영농규모 vs 반입기여도
  { code: 'Q6', a: 1, b: 2 },  // 영농기간 vs 반입기여도
] as const

// ── 결과 인터페이스 ────────────────────────────────────────────────
export interface AHPResult {
  n: number
  items: readonly ItemDef[]
  matrix: number[][]       // 원본 쌍대비교 행렬
  normalized: number[][]   // 정규화된 행렬
  weights: number[]        // 가중치 (행 평균)
  weightMap: Record<string, number>  // { itemKey: weight }
  lambdaMax: number
  ci: number
  cr: number
  isValid: boolean         // CR ≤ 0.1
  ranks: number[]          // 1-based 순위 (1=최고 가중치)
  score200: number[]       // 200점 환산
  score300: number[]       // 300점 환산
}

// ── 핵심 수학 함수 ─────────────────────────────────────────────────

/**
 * rawValue → 행렬값 변환
 * rawValue > 0 : 좌측(A)이 rawValue배 중요 → matrixValue = rawValue
 * rawValue < 0 : 우측(B)이 |rawValue|배 중요 → matrixValue = 1/|rawValue|
 * rawValue = 0 : 동등 → matrixValue = 1
 */
export function toMatrixValue(rawValue: number): number {
  if (rawValue > 0) return rawValue
  if (rawValue < 0) return 1 / Math.abs(rawValue)
  return 1
}

/**
 * n×n 쌍대비교 행렬 생성
 * - 대각: 1
 * - matrix[a][b] = matrixValue
 * - matrix[b][a] = 1 / matrixValue
 * - 답변 없는 쌍: 동등(1)로 처리
 */
export function buildMatrix(
  answers: { questionCode: string; rawValue: number }[],
  pairs: readonly PairDef[],
  n: number
): number[][] {
  // 전체 1로 초기화 (대각=1, 나머지=1 → 기본 동등)
  const matrix: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(1)
  )

  for (const pair of pairs) {
    const answer = answers.find((a) => a.questionCode === pair.code)
    const mv = answer !== undefined ? toMatrixValue(answer.rawValue) : 1
    matrix[pair.a][pair.b] = mv
    matrix[pair.b][pair.a] = 1 / mv
  }

  return matrix
}

/**
 * 열 합으로 정규화 (각 원소 ÷ 해당 열 합)
 */
export function normalizeMatrix(matrix: number[][]): number[][] {
  const n = matrix.length

  // 열 합 계산
  const colSums = Array(n).fill(0) as number[]
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += matrix[i][j]
    }
  }

  // 각 원소를 열 합으로 나눔
  return matrix.map((row) => row.map((val, j) => val / colSums[j]))
}

/**
 * 정규화 행렬의 행 평균 = 가중치
 */
export function calcWeights(normalized: number[][]): number[] {
  const n = normalized.length
  return normalized.map((row) => row.reduce((sum, v) => sum + v, 0) / n)
}

/**
 * λmax = (1/n) * Σ_i [ (Aw)_i / w_i ]
 * (Aw)_i = Σ_j matrix[i][j] * weights[j]
 */
export function calcLambdaMax(matrix: number[][], weights: number[]): number {
  const n = weights.length
  let sum = 0
  for (let i = 0; i < n; i++) {
    let awi = 0
    for (let j = 0; j < n; j++) {
      awi += matrix[i][j] * weights[j]
    }
    sum += awi / weights[i]
  }
  return sum / n
}

/**
 * CI = (λmax - n) / (n - 1)
 */
export function calcCI(lambdaMax: number, n: number): number {
  if (n <= 1) return 0
  return (lambdaMax - n) / (n - 1)
}

/**
 * CR = CI / RI[n]
 * n ≤ 2이면 CR = 0 (항상 일관)
 */
export function calcCR(ci: number, n: number): number {
  const ri = RI[n] ?? 0
  if (ri === 0) return 0
  return ci / ri
}

/**
 * 집단 쌍대비교 행렬 — 기하평균
 * group[i][j] = (m1[i][j] × m2[i][j] × ... × mk[i][j]) ^ (1/k)
 * k = 행렬(유효 응답자) 수
 */
export function calcGroupMatrix(matrices: number[][][]): number[][] {
  if (matrices.length === 0) throw new Error('[AHP] calcGroupMatrix: 빈 행렬 배열')
  const k = matrices.length
  const n = matrices[0].length

  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1
      const product = matrices.reduce((prod, m) => prod * m[i][j], 1)
      return Math.pow(product, 1 / k)
    })
  )
}

// ── 내부 헬퍼 ─────────────────────────────────────────────────────

/** 가중치 배열 → 1-based 순위 (높은 가중치 = 낮은 순위 숫자) */
function calcRanks(weights: number[]): number[] {
  const indexed = weights.map((w, i) => ({ w, i })).sort((a, b) => b.w - a.w)
  const rankMap = new Map<number, number>()
  indexed.forEach(({ i }, rank) => rankMap.set(i, rank + 1))
  return weights.map((_, i) => rankMap.get(i)!)
}

/** 공통 파이프라인: 행렬 생성 → 정규화 → 가중치 → λmax → CI → CR → 결과 */
function buildAHPResult(
  answers: { questionCode: string; rawValue: number }[],
  items: readonly ItemDef[],
  pairs: readonly PairDef[],
  n: number
): AHPResult {
  const matrix = buildMatrix(answers, pairs, n)
  const normalized = normalizeMatrix(matrix)
  const weights = calcWeights(normalized)
  const lambdaMax = calcLambdaMax(matrix, weights)
  const ci = calcCI(lambdaMax, n)
  const cr = calcCR(ci, n)

  const weightMap: Record<string, number> = {}
  items.forEach((item, i) => {
    weightMap[item.key] = weights[i]
  })

  const ranks = calcRanks(weights)
  // 소수점 2자리 반올림
  const score200 = weights.map((w) => Math.round(w * 200 * 100) / 100)
  const score300 = weights.map((w) => Math.round(w * 300 * 100) / 100)

  return {
    n,
    items,
    matrix,
    normalized,
    weights,
    weightMap,
    lambdaMax,
    ci,
    cr,
    isValid: cr <= 0.1,
    ranks,
    score200,
    score300,
  }
}

// ── 퍼블릭 파이프라인 ──────────────────────────────────────────────

/**
 * 4개 항목 AHP 분석 (투자규모·영농규모·영농기간·반입기여도)
 * 6문항 Q1~Q6 사용
 */
export function analyzeAHP4(
  answers: { questionCode: string; rawValue: number }[]
): AHPResult {
  return buildAHPResult(answers, ITEMS4, PAIRS4, 4)
}

/**
 * 3개 항목 AHP 분석 (투자규모 제외: 영농규모·영농기간·반입기여도)
 * Q4, Q5, Q6만 사용 (나머지 무시)
 */
export function analyzeAHP3(
  answers: { questionCode: string; rawValue: number }[]
): AHPResult {
  const filtered = answers.filter((a) =>
    ['Q4', 'Q5', 'Q6'].includes(a.questionCode)
  )
  return buildAHPResult(filtered, ITEMS3, PAIRS3, 3)
}
