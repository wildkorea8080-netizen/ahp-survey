/**
 * 제출 데이터 무결성 해시
 * SHA-256으로 응답자 ID + 답변 + 제출시각을 해시화하여 위변조 감지
 * Node.js crypto 모듈 사용 (Edge Runtime 불가 — API Route 전용)
 */

import crypto from 'crypto'

interface HashInput {
  respondentId: string
  answers: { questionCode: string; rawValue: number }[]
  submittedAt: string  // ISO 8601 형식
}

/**
 * 데이터를 정규화된 JSON 문자열로 직렬화
 * - answers를 questionCode 기준 정렬 (입력 순서 무관하게 동일 해시 보장)
 */
function serialize(data: HashInput): string {
  const normalized = {
    respondentId: data.respondentId,
    answers: [...data.answers]
      .sort((a, b) => a.questionCode.localeCompare(b.questionCode))
      .map((a) => ({ questionCode: a.questionCode, rawValue: a.rawValue })),
    submittedAt: data.submittedAt,
  }
  return JSON.stringify(normalized)
}

/**
 * 제출 데이터 SHA-256 해시 생성
 */
export function generateDataHash(data: HashInput): string {
  const payload = serialize(data)
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex')
}

/**
 * 해시 검증
 * @param data 검증할 원본 데이터
 * @param hash 저장된 해시값
 * @returns 일치하면 true
 */
export function verifyDataHash(data: HashInput, hash: string): boolean {
  const expected = generateDataHash(data)
  // timing-safe 비교 (길이가 다르면 false)
  if (expected.length !== hash.length) return false
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(hash, 'hex')
  )
}
