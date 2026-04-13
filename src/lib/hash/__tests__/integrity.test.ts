/**
 * 데이터 무결성 해시 테스트
 */

import { generateDataHash, verifyDataHash } from '../integrity'

const BASE_INPUT = {
  respondentId: 'cltest001',
  answers: [
    { questionCode: 'Q1', rawValue: 3 },
    { questionCode: 'Q2', rawValue: 5 },
    { questionCode: 'Q3', rawValue: 7 },
    { questionCode: 'Q4', rawValue: 2 },
    { questionCode: 'Q5', rawValue: 3 },
    { questionCode: 'Q6', rawValue: 2 },
  ],
  submittedAt: '2026-04-13T09:00:00.000Z',
}

describe('generateDataHash', () => {
  test('SHA-256 16진수 문자열 64자 반환', () => {
    const hash = generateDataHash(BASE_INPUT)
    expect(typeof hash).toBe('string')
    expect(hash).toHaveLength(64)
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true)
  })

  test('동일 입력 → 동일 해시 (결정적)', () => {
    const h1 = generateDataHash(BASE_INPUT)
    const h2 = generateDataHash(BASE_INPUT)
    expect(h1).toBe(h2)
  })

  test('답변 순서 무관하게 동일 해시 생성', () => {
    const shuffled = {
      ...BASE_INPUT,
      answers: [...BASE_INPUT.answers].reverse(),
    }
    expect(generateDataHash(BASE_INPUT)).toBe(generateDataHash(shuffled))
  })

  test('respondentId 변경 → 다른 해시', () => {
    const other = { ...BASE_INPUT, respondentId: 'cltest002' }
    expect(generateDataHash(BASE_INPUT)).not.toBe(generateDataHash(other))
  })

  test('rawValue 변경 → 다른 해시', () => {
    const other = {
      ...BASE_INPUT,
      answers: BASE_INPUT.answers.map((a, i) =>
        i === 0 ? { ...a, rawValue: 9 } : a
      ),
    }
    expect(generateDataHash(BASE_INPUT)).not.toBe(generateDataHash(other))
  })

  test('submittedAt 변경 → 다른 해시', () => {
    const other = { ...BASE_INPUT, submittedAt: '2026-04-14T00:00:00.000Z' }
    expect(generateDataHash(BASE_INPUT)).not.toBe(generateDataHash(other))
  })
})

describe('verifyDataHash', () => {
  test('올바른 해시 → true', () => {
    const hash = generateDataHash(BASE_INPUT)
    expect(verifyDataHash(BASE_INPUT, hash)).toBe(true)
  })

  test('잘못된 해시 → false', () => {
    const badHash = 'a'.repeat(64)
    expect(verifyDataHash(BASE_INPUT, badHash)).toBe(false)
  })

  test('데이터 변조 → false', () => {
    const hash = generateDataHash(BASE_INPUT)
    const tampered = { ...BASE_INPUT, respondentId: 'hacker' }
    expect(verifyDataHash(tampered, hash)).toBe(false)
  })

  test('길이 다른 해시 → false', () => {
    const shortHash = 'abc'
    expect(verifyDataHash(BASE_INPUT, shortHash)).toBe(false)
  })
})
