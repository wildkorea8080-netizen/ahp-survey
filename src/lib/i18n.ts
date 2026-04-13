/**
 * 경량 i18n 유틸리티
 * 현재: ko 고정 (JSON import로 번들에 포함)
 * 3단계: next-i18next로 교체, locale 파라미터로 확장
 */

import koCommon from '@/locales/ko/common.json'
import koSurvey from '@/locales/ko/survey.json'
import koPdf from '@/locales/ko/pdf.json'

const resources = {
  ko: {
    common: koCommon,
    survey: koSurvey,
    pdf: koPdf,
  },
} as const

type Namespace = keyof typeof resources.ko
type Resources = typeof resources.ko

/** 중첩 객체에서 dot notation 키로 값을 꺼낸다 */
function getByPath(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const part of parts) {
    if (cur === null || typeof cur !== 'object') return path
    cur = (cur as Record<string, unknown>)[part]
    if (cur === undefined) return path
  }
  return typeof cur === 'string' ? cur : path
}

/**
 * 동기 번역 함수 반환 (번들 import — 서버·클라이언트 모두 사용 가능)
 * @example const t = getT('survey'); t('intro.title')
 */
export function getT<N extends Namespace>(ns: N): (key: string) => string {
  const dict = resources.ko[ns] as Record<string, unknown>
  return (key: string) => getByPath(dict, key)
}

// ── 편의 re-export (타입 안전 직접 접근) ──────────────────────────
export const ko = resources.ko

/** 앱 전체에서 사용하는 공통 텍스트 */
export const tCommon = getT('common')
/** 설문 관련 텍스트 */
export const tSurvey = getT('survey')
/** PDF 관련 텍스트 */
export const tPdf = getT('pdf')

export type { Resources, Namespace }
