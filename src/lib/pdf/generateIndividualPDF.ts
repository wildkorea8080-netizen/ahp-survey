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
const L = 50   // 좌 여백
const R = 50   // 우 여백
const W = A4.width - L - R  // 콘텐츠 폭

function fmtRaw(raw: number, aLabel: string, bLabel: string): string {
  if (raw === 0) return '동등 (1)'
  if (raw > 0) return `${aLabel} ${raw}배 중요`
  return `${bLabel} ${Math.abs(raw)}배 중요`
}

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

  const submittedStr = respondent.submittedAt
    ? new Date(respondent.submittedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : '—'

  // ════════════════════════════════════════════════════════════
  // Page 1: 표지
  // ════════════════════════════════════════════════════════════
  const p1 = pdfDoc.addPage([A4.width, A4.height])

  // 헤더 바
  drawRect(p1, 0, A4.height - 90, A4.width, 90, COLORS.navy)
  drawText(p1, ORG, L, A4.height - 28, font, 9, COLORS.white)
  drawText(p1, respondent.round.survey.title, L, A4.height - 52, font, 13, COLORS.white)
  drawText(p1, `제${respondent.round.roundNo}회차`, L, A4.height - 74, font, 9, rgb(0.7, 0.85, 1))

  // 문서 제목 (중앙)
  const title = tPdf('individual.title')
  const titleW = font.widthOfTextAtSize(title, 22)
  drawText(p1, title, (A4.width - titleW) / 2, A4.height - 180, font, 22, COLORS.navy)

  const subtitle = tPdf('individual.subtitle')
  const subW = font.widthOfTextAtSize(subtitle, 11)
  drawText(p1, subtitle, (A4.width - subW) / 2, A4.height - 210, font, 11, COLORS.gray)

  drawHLine(p1, L, A4.height - 228, W, 1, COLORS.navy)

  // 응답자 정보 박스 (y=380~560 영역)
  const BOX_TOP = A4.height - 270
  const BOX_H = 160
  drawBorderRect(p1, L + 30, BOX_TOP - BOX_H, W - 60, BOX_H, COLORS.navy, 1)
  drawRect(p1, L + 30, BOX_TOP - 22, W - 60, 22, COLORS.navyLight)
  drawText(p1, '응  답  자  정  보', L + 38, BOX_TOP - 16, font, 10, COLORS.navy)

  const fields: [string, string][] = [
    ['성       명', respondent.name],
    ['소  속  기  관', respondent.organization],
    ['직       위', respondent.position],
    ['전문가 구분', respondent.category],
  ]
  fields.forEach(([label, value], i) => {
    const y = BOX_TOP - 45 - i * 28
    drawText(p1, label, L + 45, y, font, 9, COLORS.gray)
    drawText(p1, ':', L + 135, y, font, 9, COLORS.gray)
    drawText(p1, value, L + 148, y, font, 9, COLORS.black)
    if (i < 3) drawHLine(p1, L + 35, y - 9, W - 70, 0.3, COLORS.navyLight)
  })

  // 제출 일시
  const dtY = BOX_TOP - BOX_H - 25
  drawText(p1, '제출 일시', L + 45, dtY, font, 9, COLORS.gray)
  drawText(p1, ':', L + 135, dtY, font, 9, COLORS.gray)
  drawText(p1, submittedStr, L + 148, dtY, font, 9, COLORS.black)

  // 하단 발급 기관
  const issuedBy = tPdf('individual.issued_by')
  const issuedW = font.widthOfTextAtSize(issuedBy, 10)
  drawText(p1, issuedBy, (A4.width - issuedW) / 2, 150, font, 10, COLORS.navy)
  const notice = '본 확인서는 AHP 전문가 설문 응답 원본의 공식 기록입니다.'
  drawText(p1, notice, (A4.width - font.widthOfTextAtSize(notice, 8)) / 2, 130, font, 8, COLORS.gray)

  drawFooter(p1, font, 1, TOTAL_PAGES, ORG)

  // ════════════════════════════════════════════════════════════
  // Page 2: 설문 응답 원본
  // ════════════════════════════════════════════════════════════
  const p2 = pdfDoc.addPage([A4.width, A4.height])

  // 헤더
  drawRect(p2, 0, A4.height - 45, A4.width, 45, COLORS.navyLight)
  drawText(p2, '설문 응답 원본', L, A4.height - 28, font, 13, COLORS.navy)
  const nameLabel = respondent.name + ' 귀하'
  drawText(p2, nameLabel,
    A4.width - R - font.widthOfTextAtSize(nameLabel, 9),
    A4.height - 28, font, 9, COLORS.gray)

  // ─── 응답 테이블 ─────────────────────────────────────
  let curY = A4.height - 60

  // 테이블 헤더
  const COL = { no: L, a: L + 20, vs: L + 140, b: L + 165, sel: L + 290, meaning: L + 345 }
  const ROW_H = 22

  drawRect(p2, L, curY - ROW_H, W, ROW_H, COLORS.navy)
  drawText(p2, '문항', COL.no + 2, curY - 15, font, 8, COLORS.white)
  drawText(p2, '좌측 항목', COL.a, curY - 15, font, 8, COLORS.white)
  drawText(p2, '우측 항목', COL.b, curY - 15, font, 8, COLORS.white)
  drawText(p2, '선택값', COL.sel, curY - 15, font, 8, COLORS.white)
  drawText(p2, '응답 내용', COL.meaning, curY - 15, font, 8, COLORS.white)
  curY -= ROW_H

  // 테이블 행
  PAIRS4.forEach((pair, idx) => {
    const answer = respondent.answers.find((a) => a.questionCode === pair.code)
    const raw = answer?.rawValue ?? 0
    const itemA = ITEMS4[pair.a].label
    const itemB = ITEMS4[pair.b].label
    const bgColor = idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.97, 0.98)
    const selColor = raw > 0 ? COLORS.navy : raw < 0 ? COLORS.green : COLORS.gray

    // 행 배경
    drawRect(p2, L, curY - ROW_H, W, ROW_H, bgColor)
    drawHLine(p2, L, curY - ROW_H, W, 0.3, COLORS.navyLight)

    const textY = curY - 15

    drawText(p2, pair.code, COL.no + 2, textY, font, 8, COLORS.gray)
    drawText(p2, itemA, COL.a, textY, font, 8, COLORS.navy)
    drawText(p2, 'vs', COL.vs, textY, font, 8, COLORS.gray)
    drawText(p2, itemB, COL.b, textY, font, 8, COLORS.green)

    // 선택값 강조 박스
    const selStr = raw === 0 ? '1(동등)' : raw > 0 ? `←  ${raw}` : `${Math.abs(raw)}  →`
    drawRect(p2, COL.sel - 2, curY - ROW_H + 3, 40, 16, selColor)
    drawText(p2, selStr, COL.sel + 2, textY, font, 8, COLORS.white)

    // 응답 의미
    drawText(p2, fmtRaw(raw, itemA, itemB), COL.meaning, textY, font, 8, COLORS.black)

    curY -= ROW_H
  })

  // 테이블 외곽선
  const tableTop = A4.height - 60
  const tableBottom = curY
  drawBorderRect(p2, L, tableBottom, W, tableTop - tableBottom, COLORS.navy, 0.5)

  // ─── 서명 영역 ─────────────────────────────────────
  curY -= 20
  drawHLine(p2, L, curY, W, 0.8, COLORS.navy)
  curY -= 18
  drawText(p2, '응 답 자 서 명', L, curY, font, 10, COLORS.navy)
  curY -= 8

  const SIG_W = 220
  const SIG_H = 70
  if (respondent.signature?.imageData) {
    try {
      const dataUrl = respondent.signature.imageData
      const base64 = dataUrl.replace(/^data:image\/[a-z+]+;base64,/, '')
      const imgBytes = Buffer.from(base64, 'base64')
      const isPng = dataUrl.includes('png')
      const img = isPng
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes)
      drawBorderRect(p2, L, curY - SIG_H, SIG_W, SIG_H, COLORS.gray, 0.5)
      p2.drawImage(img, { x: L + 2, y: curY - SIG_H + 2, width: SIG_W - 4, height: SIG_H - 4 })
    } catch (e) {
      console.error('[PDF] 서명 임베딩 실패:', e)
      drawBorderRect(p2, L, curY - SIG_H, SIG_W, SIG_H, COLORS.gray, 0.5)
      drawText(p2, '[서명 이미지 로드 실패]', L + 40, curY - SIG_H / 2, font, 8, COLORS.gray)
    }
  } else {
    drawBorderRect(p2, L, curY - SIG_H, SIG_W, SIG_H, COLORS.gray, 0.5)
    drawText(p2, '[서명 없음]', L + 80, curY - SIG_H / 2, font, 8, COLORS.gray)
  }

  // 서명 아래 이름 / 날짜
  const sigDate = respondent.signature?.signedAt
    ? new Date(respondent.signature.signedAt as Date).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : submittedStr
  drawText(p2, `서명일: ${sigDate}`, L, curY - SIG_H - 14, font, 8, COLORS.gray)

  drawFooter(p2, font, 2, TOTAL_PAGES, ORG)

  // ════════════════════════════════════════════════════════════
  // Page 3: 제출 증빙
  // ════════════════════════════════════════════════════════════
  const p3 = pdfDoc.addPage([A4.width, A4.height])

  drawRect(p3, 0, A4.height - 45, A4.width, 45, COLORS.navyLight)
  drawText(p3, '제출 증빙', L, A4.height - 28, font, 13, COLORS.navy)

  let y3 = A4.height - 70

  // 제출 기록
  y3 = drawSectionHeader(p3, font, '제출 기록', y3, COLORS.navy)
  const log = respondent.submissionLog
  const logRows: [string, string][] = [
    ['응답자 ID', respondentId],
    ['제출 일시', submittedStr],
    ['IP 주소', log?.ipAddress ?? '—'],
    ['브라우저 / 기기', truncate(log?.userAgent ?? '—', font, 8, 350)],
  ]
  logRows.forEach(([label, value], i) => {
    const rowY = y3 - i * 22
    drawRect(p3, L, rowY - 18, W, 22, i % 2 === 0 ? rgb(1,1,1) : rgb(0.97,0.97,0.98))
    drawText(p3, label, L + 8, rowY - 10, font, 8.5, COLORS.gray)
    drawText(p3, ':', L + 110, rowY - 10, font, 8.5, COLORS.gray)
    drawText(p3, value, L + 120, rowY - 10, font, 8.5, COLORS.black)
    drawHLine(p3, L, rowY - 18, W, 0.3, COLORS.navyLight)
  })
  drawBorderRect(p3, L, y3 - logRows.length * 22 - 18, W, logRows.length * 22 + 18, COLORS.navy, 0.4)
  y3 -= logRows.length * 22 + 30

  // 데이터 무결성
  y3 = drawSectionHeader(p3, font, '데이터 무결성 (SHA-256)', y3, COLORS.navy)
  const hash = log?.dataHash ?? '—'
  const half = Math.ceil(hash.length / 2)
  drawText(p3, hash.slice(0, half), L + 8, y3 - 8, font, 7.5, COLORS.black)
  drawText(p3, hash.slice(half), L + 8, y3 - 22, font, 7.5, COLORS.black)
  y3 -= 45

  // 고지
  drawHLine(p3, L, y3, W, 0.5, COLORS.navyLight)
  y3 -= 18
  const notices = [
    '본 확인서는 응답자의 전자서명이 포함된 원본 기록입니다.',
    '제출된 응답 데이터는 SHA-256 해시로 무결성이 보장됩니다.',
    '가중치 및 CR 등 분석 결과는 이 문서에 포함되지 않습니다.',
    '본 자료는 해농공매 물량 배분 가중치 산출 목적으로만 사용됩니다.',
  ]
  notices.forEach((n) => {
    drawText(p3, `• ${n}`, L + 8, y3, font, 8, COLORS.gray)
    y3 -= 16
  })

  drawFooter(p3, font, 3, TOTAL_PAGES, ORG)

  return pdfDoc.save()
}
