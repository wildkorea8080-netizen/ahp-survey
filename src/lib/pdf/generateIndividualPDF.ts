/**
 * 응답자 개별 확인서 PDF 생성
 * CLAUDE.md 절대 원칙 #3: 응답자 PDF에 분석 결과(가중치/CR) 포함 금지
 * 3페이지: 표지 / 설문 원본 재현 / 증빙
 */

import { PDFDocument, rgb } from 'pdf-lib'
import { loadKoreanFont } from './fonts'
import {
  A4, COLORS, drawText, drawHLine, drawRect, drawBorderRect,
  drawFooter, drawSectionHeader, truncate,
} from './pdfUtils'
import { tPdf } from '@/lib/i18n'
import { PAIRS4, ITEMS4 } from '@/lib/ahp/calculator'
import { prisma } from '@/lib/prisma'

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? '(사)해외농업자원개발협회'
const TOTAL_PAGES = 3

export async function generateIndividualPDF(respondentId: string): Promise<Uint8Array> {
  const respondent = await prisma.respondent.findUnique({
    where: { id: respondentId },
    include: {
      answers: { orderBy: { questionCode: 'asc' } },
      signature: true,
      submissionLog: true,
      round: { include: { survey: true } },
    },
  })

  if (!respondent) throw new Error('응답자를 찾을 수 없습니다')
  if (!respondent.isLocked) throw new Error('아직 제출되지 않은 응답입니다')

  const pdfDoc = await PDFDocument.create()
  const font = await loadKoreanFont(pdfDoc)

  // ─── Page 1: 표지 ─────────────────────────────────────────────
  const p1 = pdfDoc.addPage([A4.width, A4.height])

  // 상단 헤더 바
  drawRect(p1, 0, A4.height - 80, A4.width, 80, COLORS.navy)
  drawText(p1, ORG, 50, A4.height - 30, font, 9, COLORS.white)
  drawText(p1, respondent.round.survey.title, 50, A4.height - 52, font, 13, COLORS.white)
  drawText(p1, `제${respondent.round.roundNo}회차`, 50, A4.height - 70, font, 9, rgb(0.7, 0.85, 1))

  // 문서 제목
  const title = tPdf('individual.title')
  const titleW = font.widthOfTextAtSize(title, 22)
  drawText(p1, title, (A4.width - titleW) / 2, A4.height - 170, font, 22, COLORS.navy)

  const subtitle = tPdf('individual.subtitle')
  const subW = font.widthOfTextAtSize(subtitle, 11)
  drawText(p1, subtitle, (A4.width - subW) / 2, A4.height - 200, font, 11, COLORS.gray)

  drawHLine(p1, 50, A4.height - 215, A4.width - 100, 1, COLORS.navy)

  // 응답자 정보 박스
  const boxY = A4.height - 390
  drawBorderRect(p1, 80, boxY, A4.width - 160, 150, COLORS.navy, 1)
  drawRect(p1, 80, boxY + 130, A4.width - 160, 20, COLORS.navyLight)
  drawText(p1, '응답자 정보', 90, boxY + 134, font, 10, COLORS.navy)

  const fields = [
    ['성명', respondent.name],
    ['소속기관', respondent.organization],
    ['직위', respondent.position],
    ['전문가 구분', respondent.category],
  ]
  fields.forEach(([label, value], i) => {
    const y = boxY + 105 - i * 25
    drawText(p1, label, 100, y, font, 9, COLORS.gray)
    drawText(p1, ':', 155, y, font, 9, COLORS.gray)
    drawText(p1, value, 170, y, font, 9, COLORS.black)
    if (i < 3) drawHLine(p1, 90, y - 6, A4.width - 180, 0.3, COLORS.navyLight)
  })

  // 제출 일시
  const submittedStr = respondent.submittedAt
    ? new Date(respondent.submittedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : '—'
  drawText(p1, '제출 일시', 100, boxY - 30, font, 9, COLORS.gray)
  drawText(p1, ':', 155, boxY - 30, font, 9, COLORS.gray)
  drawText(p1, submittedStr, 170, boxY - 30, font, 9, COLORS.black)

  // 발급 기관
  const issuedBy = tPdf('individual.issued_by')
  const issuedW = font.widthOfTextAtSize(issuedBy, 10)
  drawText(p1, issuedBy, (A4.width - issuedW) / 2, 140, font, 10, COLORS.navy)
  drawText(p1, '본 확인서는 AHP 전문가 설문 응답 원본의 공식 기록입니다.',
    (A4.width - font.widthOfTextAtSize('본 확인서는 AHP 전문가 설문 응답 원본의 공식 기록입니다.', 8)) / 2,
    120, font, 8, COLORS.gray)

  drawFooter(p1, font, 1, TOTAL_PAGES, ORG)

  // ─── Page 2: 설문 원본 재현 ───────────────────────────────────
  const p2 = pdfDoc.addPage([A4.width, A4.height])

  // 상단
  drawRect(p2, 0, A4.height - 45, A4.width, 45, COLORS.navyLight)
  drawText(p2, '설문 응답 원본', 50, A4.height - 28, font, 13, COLORS.navy)
  drawText(p2, respondent.name + ' 귀하', A4.width - 50 - font.widthOfTextAtSize(respondent.name + ' 귀하', 9), A4.height - 28, font, 9, COLORS.gray)

  let curY = A4.height - 65

  for (const pair of PAIRS4) {
    const answer = respondent.answers.find((a) => a.questionCode === pair.code)
    const rawValue = answer?.rawValue ?? 0
    const itemA = ITEMS4[pair.a].label
    const itemB = ITEMS4[pair.b].label

    // 문항 헤더
    drawRect(p2, 50, curY - 2, A4.width - 100, 16, COLORS.navyLight)
    drawText(p2, `${pair.code}. ${itemA}  vs  ${itemB}`, 58, curY, font, 9, COLORS.navy)
    curY -= 20

    // 척도 버튼 행
    const LEFT_VALS = [9, 8, 7, 6, 5, 4, 3, 2]
    const RIGHT_VALS = [2, 3, 4, 5, 6, 7, 8, 9]
    const btnW = 20
    const centerX = A4.width / 2
    const rowY = curY - 14

    // 좌측 라벨
    const itemAW = font.widthOfTextAtSize(itemA, 8)
    drawText(p2, itemA, centerX - 100 - itemAW - 4, rowY + 3, font, 8, COLORS.navy)
    // 우측 라벨
    drawText(p2, itemB, centerX + 104, rowY + 3, font, 8, COLORS.green)

    // 좌측 버튼 (9→2)
    LEFT_VALS.forEach((val, i) => {
      const x = centerX - 100 + i * (btnW + 1)
      const selected = rawValue === val
      if (selected) {
        drawRect(p2, x, rowY - 2, btnW, 16, COLORS.navy)
        drawText(p2, String(val), x + (val >= 10 ? 2 : 5), rowY + 1, font, 8, COLORS.white)
      } else {
        drawBorderRect(p2, x, rowY - 2, btnW, 16, COLORS.gray, 0.4)
        drawText(p2, String(val), x + (val >= 10 ? 2 : 5), rowY + 1, font, 8, COLORS.gray)
      }
    })

    // 중앙 버튼 (1 = rawValue 0)
    const cx = centerX - 11
    const selected0 = rawValue === 0
    if (selected0) {
      drawRect(p2, cx, rowY - 3, 22, 18, COLORS.gray)
      drawText(p2, '1', cx + 7, rowY + 2, font, 9, COLORS.white)
    } else {
      drawBorderRect(p2, cx, rowY - 3, 22, 18, COLORS.gray, 0.7)
      drawText(p2, '1', cx + 7, rowY + 2, font, 9, COLORS.gray)
    }

    // 우측 버튼 (2→9)
    RIGHT_VALS.forEach((val, i) => {
      const x = centerX + 12 + i * (btnW + 1)
      const selected = rawValue === -val
      if (selected) {
        drawRect(p2, x, rowY - 2, btnW, 16, COLORS.green)
        drawText(p2, String(val), x + (val >= 10 ? 2 : 5), rowY + 1, font, 8, COLORS.white)
      } else {
        drawBorderRect(p2, x, rowY - 2, btnW, 16, COLORS.gray, 0.4)
        drawText(p2, String(val), x + (val >= 10 ? 2 : 5), rowY + 1, font, 8, COLORS.gray)
      }
    })

    // 선택 방향 텍스트
    let dirText = '동등하게 중요'
    if (rawValue > 0) dirText = `→ ${itemA} ${rawValue}배 더 중요`
    else if (rawValue < 0) dirText = `→ ${itemB} ${Math.abs(rawValue)}배 더 중요`
    drawText(p2, dirText, 58, rowY - 8, font, 7.5,
      rawValue > 0 ? COLORS.navy : rawValue < 0 ? COLORS.green : COLORS.gray)

    curY = rowY - 20
  }

  // 서명
  curY -= 10
  drawHLine(p2, 50, curY, A4.width - 100, 0.5, COLORS.navyLight)
  curY -= 15
  drawText(p2, '응답자 서명', 50, curY, font, 9, COLORS.navy)

  if (respondent.signature?.imageData) {
    try {
      const base64 = respondent.signature.imageData.replace(/^data:image\/\w+;base64,/, '')
      const imgBytes = Buffer.from(base64, 'base64')
      const img = respondent.signature.imageData.includes('png')
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes)
      p2.drawImage(img, { x: 50, y: curY - 65, width: 180, height: 55 })
      drawBorderRect(p2, 50, curY - 65, 180, 55, COLORS.gray, 0.5)
    } catch {
      drawBorderRect(p2, 50, curY - 65, 180, 55, COLORS.gray, 0.5)
      drawText(p2, '[서명 이미지]', 90, curY - 38, font, 8, COLORS.gray)
    }
  }

  drawFooter(p2, font, 2, TOTAL_PAGES, ORG)

  // ─── Page 3: 증빙 ─────────────────────────────────────────────
  const p3 = pdfDoc.addPage([A4.width, A4.height])

  drawRect(p3, 0, A4.height - 45, A4.width, 45, COLORS.navyLight)
  drawText(p3, '제출 증빙', 50, A4.height - 28, font, 13, COLORS.navy)

  let y3 = A4.height - 80

  // 제출 로그 섹션
  y3 = drawSectionHeader(p3, font, '제출 기록', y3, COLORS.navy)

  const log = respondent.submissionLog
  const logFields: [string, string][] = [
    ['응답자 ID', respondentId],
    ['제출 일시', submittedStr],
    ['IP 주소', log?.ipAddress ?? '—'],
    ['브라우저/기기', truncate(log?.userAgent ?? '—', font, 8, 350)],
  ]
  logFields.forEach(([label, value]) => {
    drawText(p3, label, 60, y3, font, 8.5, COLORS.gray)
    drawText(p3, ':', 140, y3, font, 8.5, COLORS.gray)
    drawText(p3, value, 150, y3, font, 8.5, COLORS.black)
    y3 -= 18
  })

  y3 -= 10
  y3 = drawSectionHeader(p3, font, '데이터 무결성 (SHA-256)', y3, COLORS.navy)

  const hash = log?.dataHash ?? '—'
  // 해시는 길어서 두 줄로 나눔
  const half = Math.ceil(hash.length / 2)
  drawText(p3, hash.slice(0, half), 60, y3, font, 7.5, COLORS.black)
  y3 -= 14
  drawText(p3, hash.slice(half), 60, y3, font, 7.5, COLORS.black)
  y3 -= 24

  // 고지 문구
  y3 -= 10
  drawHLine(p3, 50, y3, A4.width - 100, 0.5, COLORS.navyLight)
  y3 -= 20

  const notices = [
    '본 확인서는 응답자의 전자서명이 포함된 원본 기록입니다.',
    '제출된 응답 데이터는 SHA-256 해시로 무결성이 보장됩니다.',
    '가중치 및 CR 등 분석 결과는 이 문서에 포함되지 않습니다.',
    '본 자료는 해농공매 물량 배분 가중치 산출 목적으로만 사용됩니다.',
  ]
  notices.forEach((notice) => {
    drawText(p3, `• ${notice}`, 60, y3, font, 8, COLORS.gray)
    y3 -= 16
  })

  drawFooter(p3, font, 3, TOTAL_PAGES, ORG)

  return pdfDoc.save()
}
