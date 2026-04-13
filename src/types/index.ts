/**
 * AHP SaaS 공통 타입 정의
 * AHP_SPEC.md 기준
 */

// ─── 평가항목 상수 ───────────────────────────────────────────────
export const ITEM_LABELS = {
  inv:  '투자규모',
  farm: '영농규모',
  per:  '영농기간',
  imp:  '반입기여도',
} as const

export type ItemKey = keyof typeof ITEM_LABELS

/** 4개 항목 (투자규모 포함) */
export const ITEMS4: ItemKey[] = ['inv', 'farm', 'per', 'imp']

/** 3개 항목 (투자규모 제외) */
export const ITEMS3: ItemKey[] = ['farm', 'per', 'imp']

// ─── 쌍대비교 문항 상수 ──────────────────────────────────────────
export interface PairDef {
  code: string   // 'Q1' ~ 'Q6'
  a: ItemKey
  b: ItemKey
}

/** 4개 항목용 6문항 */
export const PAIRS4: PairDef[] = [
  { code: 'Q1', a: 'inv',  b: 'farm' },
  { code: 'Q2', a: 'inv',  b: 'per'  },
  { code: 'Q3', a: 'inv',  b: 'imp'  },
  { code: 'Q4', a: 'farm', b: 'per'  },
  { code: 'Q5', a: 'farm', b: 'imp'  },
  { code: 'Q6', a: 'per',  b: 'imp'  },
]

/** 3개 항목용 3문항 (Q4~Q6) */
export const PAIRS3: PairDef[] = [
  { code: 'Q4', a: 'farm', b: 'per'  },
  { code: 'Q5', a: 'farm', b: 'imp'  },
  { code: 'Q6', a: 'per',  b: 'imp'  },
]

// ─── RI 테이블 ───────────────────────────────────────────────────
export const RI: Record<number, number> = {
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
}

// ─── AHP 계산 결과 ───────────────────────────────────────────────
export interface AHPResult {
  /** 항목 순서대로 가중치 배열 */
  weights: number[]
  lambdaMax: number
  ci: number
  cr: number
  /** CR ≤ 0.1 */
  isValid: boolean
  /** 행렬 (정규화 전) */
  matrix: number[][]
}

// ─── CR 보정 결과 ────────────────────────────────────────────────
export interface AdjustmentStep {
  /** 변경된 문항 코드 */
  questionCode: string
  /** 조정 전 rawValue */
  before: number
  /** 조정 후 rawValue */
  after: number
  /** 조정 후 CR */
  crAfter: number
}

export interface AdjustmentResult {
  /** 보정 후 AHP 계산 결과 */
  ahpResult: AHPResult
  /** 각 단계별 조정 내역 */
  steps: AdjustmentStep[]
  /** 보정된 rawValue 맵 (questionCode → rawValue) */
  adjustedValues: Record<string, number>
}

// ─── 집단 AHP 결과 ───────────────────────────────────────────────
export interface GroupAHPResult {
  /** 유효 응답자 수 */
  validCount: number
  /** 기하평균 행렬 */
  geoMeanMatrix: number[][]
  /** 4개 항목 가중치 */
  weights4: number[]
  /** 3개 항목 가중치 */
  weights3: number[]
  /** 4개 항목 집단 CR */
  groupCr4: number
  /** 3개 항목 집단 CR */
  groupCr3: number
}

// ─── 배점 환산 ───────────────────────────────────────────────────
export interface ScoreResult {
  /** 200점 만점 환산 */
  score200: number
  /** 300점 만점 환산 */
  score300: number
}

export function calcScore(weight: number): ScoreResult {
  return {
    score200: Math.round(weight * 200 * 100) / 100,
    score300: Math.round(weight * 300 * 100) / 100,
  }
}

// ─── API 에러 형식 ───────────────────────────────────────────────
export interface ApiError {
  error: string
  code: string
  statusCode: number
}

// ─── 응답자 카테고리 ─────────────────────────────────────────────
export const RESPONDENT_CATEGORIES = [
  '정부기관',
  '공공기관',
  '학계전문가',
  '법·제도전문가',
  '회계전문가',
  '협회내부',
  '진출기업',
] as const

export type RespondentCategory = typeof RESPONDENT_CATEGORIES[number]

// ─── Prisma 타입 re-export ───────────────────────────────────────
export type {
  Survey,
  SurveyRound,
  Respondent,
  Answer,
  IndividualResult,
  CRAdjustment,
  GroupResult,
  Signature,
  SubmissionLog,
  RoundStatus,
} from '@prisma/client'
