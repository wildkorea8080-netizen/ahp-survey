/**
 * 집단 분석 결과 보고서 PDF
 * itemCount===4: 네이비 계열 / itemCount===3: 그린 계열
 * 7페이지 구성 (AHP_SPEC.md + locales/ko/pdf.json 기준)
 */

import { PDFDocument } from 'pdf-lib'
import { loadKoreanFont } from './fonts'
import {
  A4, COLORS, drawText, drawHLine, drawRect, drawBorderRect,
  drawFooter, drawSectionHeader, truncate,
} from './pdfUtils'
import { tPdf } from '@/lib/i18n'
import { ITEMS4, ITEMS3 } from '@/lib/ahp/calculator'
import { prisma } from '@/lib/prisma'
import type { RGB } from 'pdf-lib'

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? '(사)해외농업자원개발협회'
const TOTAL_PAGES = 7

export async function generateReportPDF(
  roundId: string,
  itemCount: 4 | 3
): Promise<Uint8Array> {
  const round = await prisma.surveyRound.findUnique({
    where: { id: roundId },
    include: {
      survey: true,
      groupResult: true,
      respondents: {
        where: { isLocked: true },
        include: {
          result: { include: { adjustment: true } },
        },
        orderBy: { submittedAt: 'asc' },
      },
    },
  })

  if (!round) throw new Error('설문 회차를 찾을 수 없습니다')
  if (!round.groupResult) throw new Error('분석 결과가 없습니다. 먼저 분석을 실행하세요.')

  const gr = round.groupResult
  const geoMean = gr.geoMeanMatrix as { matrix4: number[][]; matrix3: number[][] }

  const items = itemCount === 4 ? ITEMS4 : ITEMS3
  const weights = (itemCount === 4
    ? (gr.weights4 as number[])
    : (gr.weights3 as number[]))
  const groupCr = itemCount === 4 ? gr.groupCr4 : gr.groupCr3
  const matrix = itemCount === 4 ? geoMean.matrix4 : geoMean.matrix3
  const accentColor: RGB = itemCount === 4 ? COLORS.navy : COLORS.green
  const lightColor: RGB = itemCount === 4 ? COLORS.navyLight : COLORS.greenLight

  const pdfDoc = await PDFDocument.create()
  const font = await loadKoreanFont(pdfDoc)

  const calcDate = new Date(gr.calculatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  const respondents = round.respondents
  const validCount = gr.validCount

  // ─── Page 1: 표지 ─────────────────────────────────────────────
  {
    const page = pdfDoc.addPage([A4.width, A4.height])
    drawRect(page, 0, A4.height - 120, A4.width, 120, accentColor)
    drawText(page, ORG, 50, A4.height - 35, font, 10, COLORS.white)
    drawText(page, round.survey.title, 50, A4.height - 60, font, 14, COLORS.white)
    drawText(page, `제${round.roundNo}회차`, 50, A4.height - 82, font, 10, COLORS.white)
    drawText(page, `분석 기준: ${itemCount}개 항목`, 50, A4.height - 100, font, 9, COLORS.white)

    const title = tPdf('report.title')
    const tw = font.widthOfTextAtSize(title, 20)
    drawText(page, title, (A4.width - tw) / 2, A4.height - 195, font, 20, accentColor)

    const itemNames = items.map((i) => i.label).join(' · ')
    const iw = font.widthOfTextAtSize(itemNames, 10)
    drawText(page, itemNames, (A4.width - iw) / 2, A4.height - 225, font, 10, COLORS.gray)

    drawHLine(page, 80, A4.height - 240, A4.width - 160, 1, accentColor)

    // 요약 박스
    const bx = 80, by = A4.height - 420
    drawBorderRect(page, bx, by, A4.width - 160, 155, accentColor, 1)
    drawRect(page, bx, by + 135, A4.width - 160, 20, accentColor)
    drawText(page, '분석 요약', bx + 10, by + 139, font, 10, COLORS.white)

    const summaryRows: [string, string][] = [
      ['총 응답자', `${respondents.length}명`],
      ['유효 응답자', `${validCount}명 (CR ≤ 0.1)`],
      ['집단 CR', `${groupCr.toFixed(4)} ${groupCr <= 0.1 ? '✅ 허용' : '⚠ 초과'}`],
      ['최고 가중치 항목', items[[...weights].indexOf(Math.max(...weights))]?.label ?? '—'],
      ['분석 일시', calcDate],
    ]
    summaryRows.forEach(([label, value], i) => {
      const y = by + 112 - i * 22
      drawText(page, label, bx + 15, y, font, 9, COLORS.gray)
      drawText(page, ':', bx + 95, y, font, 9, COLORS.gray)
      drawText(page, value, bx + 105, y, font, 9, COLORS.black)
    })

    const issuedBy = tPdf('individual.issued_by')
    drawText(page, issuedBy, (A4.width - font.widthOfTextAtSize(issuedBy, 10)) / 2, 130, font, 10, accentColor)
    drawFooter(page, font, 1, TOTAL_PAGES, ORG)
  }

  // ─── Page 2: 조사 개요 ────────────────────────────────────────
  {
    const page = pdfDoc.addPage([A4.width, A4.height])
    drawRect(page, 0, A4.height - 45, A4.width, 45, lightColor)
    drawText(page, tPdf('report.sections.overview'), 50, A4.height - 28, font, 13, accentColor)

    let y = A4.height - 75
    y = drawSectionHeader(page, font, '설문 목적', y, accentColor)
    drawText(page, '해농공매 물량 배분 평가항목의 상대적 중요도를 AHP(계층분석법)로 산출', 60, y, font, 9, COLORS.black)
    y -= 25

    y = drawSectionHeader(page, font, '평가항목', y, accentColor)
    items.forEach((item, i) => {
      drawText(page, `${i + 1}. ${item.label}`, 70, y, font, 9, COLORS.black)
      y -= 16
    })
    y -= 10

    y = drawSectionHeader(page, font, '응답자 현황', y, accentColor)
    const catCounts: Record<string, number> = {}
    respondents.forEach((r) => {
      catCounts[r.category] = (catCounts[r.category] ?? 0) + 1
    })
    drawText(page, `총 ${respondents.length}명 응답 (유효: ${validCount}명)`, 60, y, font, 9, COLORS.black)
    y -= 16
    Object.entries(catCounts).forEach(([cat, cnt]) => {
      drawText(page, `• ${cat}: ${cnt}명`, 70, y, font, 8.5, COLORS.gray)
      y -= 14
    })

    if (itemCount === 3) {
      y -= 10
      y = drawSectionHeader(page, font, '투자규모 제외 근거', y, COLORS.amber)
      drawText(page, '투자규모(FDI 누적액)는 현행 해농공매 배분 산식에 포함되지 않아', 60, y, font, 9, COLORS.black)
      y -= 14
      drawText(page, '3개 항목(영농규모·영농기간·반입기여도) 독립 분석을 병행합니다.', 60, y, font, 9, COLORS.black)
    }

    drawFooter(page, font, 2, TOTAL_PAGES, ORG)
  }

  // ─── Page 3: 집단 행렬 + 일관성 ──────────────────────────────
  {
    const page = pdfDoc.addPage([A4.width, A4.height])
    drawRect(page, 0, A4.height - 45, A4.width, 45, lightColor)
    drawText(page, tPdf('report.sections.matrix'), 50, A4.height - 28, font, 13, accentColor)

    let y = A4.height - 75
    y = drawSectionHeader(page, font, '집단 쌍대비교 행렬 (기하평균)', y, accentColor)

    const n = items.length
    const colW = Math.min(90, (A4.width - 160) / (n + 1))
    const rowH = 22
    const tableX = 50

    // 헤더행
    drawRect(page, tableX, y - rowH + 4, colW * (n + 1), rowH, lightColor)
    items.forEach((item, j) => {
      drawText(page, truncate(item.short, font, 7.5, colW - 4),
        tableX + colW * (j + 1) + 2, y - 12, font, 7.5, accentColor)
    })
    y -= rowH

    // 데이터행
    matrix?.forEach((row, i) => {
      const rowBg = i % 2 === 0 ? COLORS.white : COLORS.bgLight
      drawRect(page, tableX, y - rowH + 4, colW * (n + 1), rowH, rowBg)
      drawText(page, truncate(items[i].short, font, 7.5, colW - 4),
        tableX + 4, y - 12, font, 7.5, accentColor)
      row.forEach((val, j) => {
        const txt = i === j ? '1.000' : val.toFixed(3)
        const tw = font.widthOfTextAtSize(txt, 7.5)
        const cx = tableX + colW * (j + 1) + (colW - tw) / 2
        drawText(page, txt, cx, y - 12, font, 7.5,
          i === j ? accentColor : COLORS.black)
      })
      y -= rowH
    })

    y -= 15
    y = drawSectionHeader(page, font, '일관성 검증', y, accentColor)
    drawText(page, `집단 CR: ${groupCr.toFixed(4)}   ${groupCr <= 0.1 ? '✅ 허용 (≤ 0.1)' : '⚠ 기준 초과 (> 0.1)'}`,
      60, y, font, 10, groupCr <= 0.1 ? COLORS.green : COLORS.red)
    y -= 16
    drawText(page, `유효 응답자 수: ${validCount}명  /  분석 일시: ${calcDate}`,
      60, y, font, 9, COLORS.gray)

    drawFooter(page, font, 3, TOTAL_PAGES, ORG)
  }

  // ─── Page 4: 가중치 결과 ──────────────────────────────────────
  {
    const page = pdfDoc.addPage([A4.width, A4.height])
    drawRect(page, 0, A4.height - 45, A4.width, 45, lightColor)
    drawText(page, tPdf('report.sections.weights'), 50, A4.height - 28, font, 13, accentColor)

    let y = A4.height - 75
    y = drawSectionHeader(page, font, '항목별 가중치', y, accentColor)

    // 테이블 헤더
    const cols = itemCount === 4
      ? ['순위', '항목', '가중치(%)', '200점', '300점', '현행50점']
      : ['순위', '항목', '가중치(%)', '200점', '300점']
    const colWidths = itemCount === 4 ? [35, 100, 65, 55, 55, 65] : [35, 120, 80, 65, 65]
    let hx = 55

    drawRect(page, 50, y - 16, A4.width - 100, 20, accentColor)
    cols.forEach((col, ci) => {
      drawText(page, col, hx + 2, y - 12, font, 8, COLORS.white)
      hx += colWidths[ci]
    })
    y -= 20

    const CURRENT_50: Record<string, number> = { inv: 10, farm: 15, per: 15, imp: 10 }

    const sorted = [...items]
      .map((item, i) => ({ item, w: weights[i], i }))
      .sort((a, b) => b.w - a.w)

    sorted.forEach(({ item, w, i: origIdx }, rank) => {
      const bg = rank % 2 === 0 ? COLORS.white : COLORS.bgLight
      drawRect(page, 50, y - 16, A4.width - 100, 20, bg)
      let rx = 55
      const cells = itemCount === 4
        ? [`${rank + 1}위`, item.label, `${(w * 100).toFixed(2)}%`,
           (w * 200).toFixed(2), (w * 300).toFixed(2),
           String(CURRENT_50[item.key] ?? '—')]
        : [`${rank + 1}위`, item.label, `${(w * 100).toFixed(2)}%`,
           (w * 200).toFixed(2), (w * 300).toFixed(2)]
      cells.forEach((cell, ci) => {
        drawText(page, truncate(cell, font, 8.5, colWidths[ci] - 4),
          rx + 2, y - 12, font, 8.5, ci === 1 ? accentColor : COLORS.black)
        rx += colWidths[ci]
      })
      y -= 20
    })

    // 막대 시각화
    y -= 15
    y = drawSectionHeader(page, font, '가중치 분포', y, accentColor)

    const barMaxW = A4.width - 220
    sorted.forEach(({ item, w }) => {
      const barW = w * barMaxW
      drawText(page, item.short, 55, y - 10, font, 8, accentColor)
      drawRect(page, 135, y - 14, barW, 12, accentColor)
      drawText(page, `${(w * 100).toFixed(2)}%`, 140 + barW, y - 10, font, 8, COLORS.black)
      y -= 20
    })

    drawFooter(page, font, 4, TOTAL_PAGES, ORG)
  }

  // ─── Page 5: 개인별 응답 요약 ─────────────────────────────────
  {
    const page = pdfDoc.addPage([A4.width, A4.height])
    drawRect(page, 0, A4.height - 45, A4.width, 45, lightColor)
    drawText(page, tPdf('report.sections.individual'), 50, A4.height - 28, font, 13, accentColor)

    let y = A4.height - 70
    const colW = [130, 80, 60, 65, 65]
    const headers = ['성명 (소속)', '구분', 'CR', '판정', '보정여부']
    drawRect(page, 50, y - 16, A4.width - 100, 20, accentColor)
    let hx = 55
    headers.forEach((h, ci) => {
      drawText(page, h, hx + 2, y - 12, font, 8, COLORS.white)
      hx += colW[ci]
    })
    y -= 20

    respondents.forEach((r, idx) => {
      if (y < 70) return // 지면 부족 시 스킵 (실운영은 다음 페이지로 분리)
      const cr = r.result?.cr ?? 0
      const isValid = r.result?.isValid ?? false
      const hasAdj = r.result?.adjustment?.useAdjusted ?? false
      const bg = idx % 2 === 0 ? COLORS.white : COLORS.bgLight
      drawRect(page, 50, y - 16, A4.width - 100, 20, bg)
      let rx = 55
      const cells = [
        truncate(`${r.name} (${r.organization})`, font, 8, colW[0] - 4),
        r.category,
        cr.toFixed(3),
        isValid ? '✅ 허용' : '⚠ 초과',
        hasAdj ? '🔧 보정' : '원본',
      ]
      cells.forEach((cell, ci) => {
        const color = ci === 3 ? (isValid ? COLORS.green : COLORS.red) : COLORS.black
        drawText(page, cell, rx + 2, y - 12, font, 8, color)
        rx += colW[ci]
      })
      y -= 20
    })

    drawFooter(page, font, 5, TOTAL_PAGES, ORG)
  }

  // ─── Page 6: 주요 시사점 ──────────────────────────────────────
  {
    const page = pdfDoc.addPage([A4.width, A4.height])
    drawRect(page, 0, A4.height - 45, A4.width, 45, lightColor)
    drawText(page, tPdf('report.sections.insights'), 50, A4.height - 28, font, 13, accentColor)

    let y = A4.height - 75

    // 자동 생성 해석 문장
    const topItem = items[[...weights].indexOf(Math.max(...weights))]
    const bottomItem = items[[...weights].indexOf(Math.min(...weights))]
    const topW = Math.max(...weights)
    const bottomW = Math.min(...weights)

    const insights = [
      `${validCount}명 전문가 집단의 AHP 분석 결과, 집단 CR은 ${groupCr.toFixed(4)}으로`,
      groupCr <= 0.1
        ? '허용 기준(0.1) 이내로 집단 의사결정의 일관성이 확보되었습니다.'
        : '허용 기준(0.1)을 초과하여 응답자 구성 재검토가 권고됩니다.',
      '',
      `가장 높은 가중치를 받은 항목은 "${topItem.label}"(${(topW * 100).toFixed(2)}%)으로,`,
      `전문가 집단이 가장 중요시하는 평가 기준임을 나타냅니다.`,
      '',
      `가장 낮은 가중치 항목은 "${bottomItem.label}"(${(bottomW * 100).toFixed(2)}%)입니다.`,
      '',
      `200점 만점 기준 배점 시 "${topItem.label}" 항목에 ${(topW * 200).toFixed(1)}점이 배분됩니다.`,
    ]

    y = drawSectionHeader(page, font, '분석 결과 해석', y, accentColor)
    insights.forEach((line) => {
      if (line === '') { y -= 6; return }
      drawText(page, line, 60, y, font, 9, COLORS.black)
      y -= 15
    })

    y -= 10
    y = drawSectionHeader(page, font, '가중치 비교', y, accentColor)
    sorted_weights(items, weights).forEach(({ item, w }, rank) => {
      drawText(page, `${rank + 1}위. ${item.label}`, 60, y, font, 9, accentColor)
      drawText(page, `${(w * 100).toFixed(2)}%  (200점: ${(w * 200).toFixed(1)}점)`,
        200, y, font, 9, COLORS.black)
      y -= 16
    })

    drawFooter(page, font, 6, TOTAL_PAGES, ORG)
  }

  // ─── Page 7: 결론 및 활용 방안 ───────────────────────────────
  {
    const page = pdfDoc.addPage([A4.width, A4.height])
    drawRect(page, 0, A4.height - 45, A4.width, 45, lightColor)
    drawText(page, tPdf('report.sections.conclusion'), 50, A4.height - 28, font, 13, accentColor)

    let y = A4.height - 75
    y = drawSectionHeader(page, font, '결론', y, accentColor)

    const conclusionLines = [
      `본 분석은 ${ORG}의 해농공매 물량 배분 기준 마련을 위한`,
      `AHP 전문가 설문 결과를 집계·분석한 보고서입니다.`,
      '',
      `${validCount}명의 전문가 집단 응답을 기하평균 방식으로 통합하여`,
      `${items.length}개 평가항목의 가중치를 산출하였습니다.`,
    ]
    conclusionLines.forEach((line) => {
      if (line === '') { y -= 6; return }
      drawText(page, line, 60, y, font, 9, COLORS.black)
      y -= 15
    })

    y -= 10
    y = drawSectionHeader(page, font, '활용 방안', y, accentColor)

    const usages = [
      `• 200점 만점 배분 산식 적용 시 가중치 × 200점`,
      `• 300점 만점 배분 산식 적용 시 가중치 × 300점`,
      `• 고용가점(+10점)은 본 가중치와 별도 적용`,
      `• 차기 회차 설문 결과와 추세 비교에 활용`,
    ]
    usages.forEach((u) => {
      drawText(page, u, 60, y, font, 9, COLORS.black)
      y -= 16
    })

    y -= 10
    drawHLine(page, 50, y, A4.width - 100, 1, accentColor)
    y -= 20
    drawText(page, `분석 일시: ${calcDate}`, 60, y, font, 8.5, COLORS.gray)
    y -= 14
    drawText(page, `발행 기관: ${ORG}`, 60, y, font, 8.5, COLORS.gray)

    drawFooter(page, font, 7, TOTAL_PAGES, ORG)
  }

  return pdfDoc.save()
}

function sorted_weights(items: readonly typeof ITEMS4[number][], weights: number[]) {
  return [...items]
    .map((item, i) => ({ item, w: weights[i] }))
    .sort((a, b) => b.w - a.w)
}
