/**
 * XLSX 내보내기
 * 시트1: 응답자 목록 + CR 상태
 * 시트2: 4개 항목 가중치
 * 시트3: 3개 항목 가중치
 * 시트4: 개인별 응답값 (rawValue)
 */

import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { ITEMS4, ITEMS3, PAIRS4, PAIRS3 } from '@/lib/ahp/calculator'

type WeightMap = Record<string, number>

export async function generateExcel(roundId: string): Promise<Uint8Array> {
  const round = await prisma.surveyRound.findUnique({
    where: { id: roundId },
    include: {
      survey: true,
      respondents: {
        where: { isLocked: true },
        orderBy: { submittedAt: 'asc' },
        include: {
          result: { include: { adjustment: true } },
          answers: { orderBy: { questionCode: 'asc' } },
        },
      },
      groupResult: true,
    },
  })

  if (!round) throw new Error('회차를 찾을 수 없습니다')

  const wb = XLSX.utils.book_new()

  // ── 시트1: 응답자 목록 + CR 상태 ──────────────────────────────────
  const sheet1Rows: unknown[][] = [
    ['#', '성명', '소속기관', '직위', '전문가 구분', '제출 일시', 'CR (원본)', 'CR 유효', 'CR 조정 여부', '조정 후 CR'],
  ]

  for (let i = 0; i < round.respondents.length; i++) {
    const r = round.respondents[i]
    const result = r.result
    const adj = result?.adjustment

    const useAdj = adj?.useAdjusted ?? false
    const cr = result?.cr ?? null
    const adjCr = adj?.adjustedCr ?? null

    sheet1Rows.push([
      i + 1,
      r.name,
      r.organization,
      r.position,
      r.category,
      r.submittedAt
        ? new Date(r.submittedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
        : '—',
      cr != null ? Number(cr.toFixed(4)) : '—',
      result?.isValid ? '유효' : '초과',
      adj ? (useAdj ? '적용' : '미적용') : '없음',
      adjCr != null ? Number(adjCr.toFixed(4)) : '—',
    ])
  }

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows)
  ws1['!cols'] = [
    { wch: 4 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 14 },
    { wch: 22 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, ws1, '응답자목록')

  // ── 시트2: 4개 항목 가중치 ────────────────────────────────────────
  const labels4 = ITEMS4.map((it) => it.label)
  const sheet2Rows: unknown[][] = [
    ['#', '성명', ...labels4, 'CR', '유효'],
  ]

  for (let i = 0; i < round.respondents.length; i++) {
    const r = round.respondents[i]
    const result = r.result
    if (!result) continue

    const adj = result.adjustment
    const useAdj = adj?.useAdjusted ?? false
    const weights = useAdj
      ? (adj!.adjustedWeights as WeightMap)
      : (result.weights as { weights4?: WeightMap }).weights4 ?? (result.weights as WeightMap)
    const cr = useAdj ? (adj!.adjustedCr) : result.cr

    sheet2Rows.push([
      i + 1,
      r.name,
      ...ITEMS4.map((it) =>
        weights[it.key] != null ? Number((weights[it.key] * 100).toFixed(2)) : '—'
      ),
      Number(cr.toFixed(4)),
      result.isValid ? '유효' : '초과',
    ])
  }

  // 집단 합산 행
  if (round.groupResult) {
    const gw4 = round.groupResult.weights4 as WeightMap
    sheet2Rows.push([
      '집단',
      '기하평균',
      ...ITEMS4.map((it) =>
        gw4[it.key] != null ? Number((gw4[it.key] * 100).toFixed(2)) : '—'
      ),
      Number(round.groupResult.groupCr4.toFixed(4)),
      round.groupResult.groupCr4 <= 0.1 ? '유효' : '초과',
    ])
  }

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows)
  ws2['!cols'] = [
    { wch: 4 }, { wch: 10 },
    ...labels4.map(() => ({ wch: 12 })),
    { wch: 10 }, { wch: 6 },
  ]
  XLSX.utils.book_append_sheet(wb, ws2, '가중치_4항목')

  // ── 시트3: 3개 항목 가중치 ────────────────────────────────────────
  const labels3 = ITEMS3.map((it) => it.label)
  const sheet3Rows: unknown[][] = [
    ['#', '성명', ...labels3, 'CR (3항목)', '유효'],
  ]

  for (let i = 0; i < round.respondents.length; i++) {
    const r = round.respondents[i]
    const result = r.result
    if (!result) continue

    const weights = result.weights as { weights3?: WeightMap; weights4?: WeightMap } & WeightMap
    const w3 = weights.weights3

    if (!w3) continue

    sheet3Rows.push([
      i + 1,
      r.name,
      ...ITEMS3.map((it) =>
        w3[it.key] != null ? Number((w3[it.key] * 100).toFixed(2)) : '—'
      ),
      '—',  // 개인 3항목 CR은 별도 저장하지 않음
      '—',
    ])
  }

  // 집단 합산 행
  if (round.groupResult) {
    const gw3 = round.groupResult.weights3 as WeightMap
    sheet3Rows.push([
      '집단',
      '기하평균',
      ...ITEMS3.map((it) =>
        gw3[it.key] != null ? Number((gw3[it.key] * 100).toFixed(2)) : '—'
      ),
      Number(round.groupResult.groupCr3.toFixed(4)),
      round.groupResult.groupCr3 <= 0.1 ? '유효' : '초과',
    ])
  }

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows)
  ws3['!cols'] = [
    { wch: 4 }, { wch: 10 },
    ...labels3.map(() => ({ wch: 12 })),
    { wch: 12 }, { wch: 6 },
  ]
  XLSX.utils.book_append_sheet(wb, ws3, '가중치_3항목')

  // ── 시트4: 개인별 응답값 ──────────────────────────────────────────
  const allCodes4 = PAIRS4.map((p) => p.code)
  const allCodes3 = PAIRS3.map((p) => p.code)
  const allCodes = [...new Set([...allCodes4, ...allCodes3])]

  // 문항 설명 헤더 (2행)
  const pairLabels = allCodes.map((code) => {
    const p4 = PAIRS4.find((p) => p.code === code)
    const p3 = PAIRS3.find((p) => p.code === code)
    const pair = p4 ?? p3
    if (!pair) return code
    const items = p4 ? ITEMS4 : ITEMS3
    return `${code}\n${items[pair.a].short} vs ${items[pair.b].short}`
  })

  const sheet4Rows: unknown[][] = [
    ['#', '성명', ...pairLabels],
  ]

  for (let i = 0; i < round.respondents.length; i++) {
    const r = round.respondents[i]
    const row: unknown[] = [i + 1, r.name]

    for (const code of allCodes) {
      const ans = r.answers.find((a) => a.questionCode === code)
      row.push(ans?.rawValue ?? '—')
    }

    sheet4Rows.push(row)
  }

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Rows)
  ws4['!cols'] = [
    { wch: 4 }, { wch: 10 },
    ...allCodes.map(() => ({ wch: 14 })),
  ]
  XLSX.utils.book_append_sheet(wb, ws4, '개인별응답값')

  const xlsxArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array
  return xlsxArray
}
