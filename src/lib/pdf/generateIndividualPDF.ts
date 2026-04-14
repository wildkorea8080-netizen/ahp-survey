/**
 * 응답자 개별 확인서 PDF 생성 (pdf-lib — 순수 JS, Vercel 완전 지원)
 * CLAUDE.md 절대 원칙 #3: 응답자 PDF에 분석 결과(가중치/CR) 포함 금지
 */

import { PDFDocument, PDFFont, rgb } from 'pdf-lib'
import { loadKoreanFont } from './fonts'
import { prisma } from '@/lib/prisma'
import { PAIRS4, ITEMS4 } from '@/lib/ahp/calculator'

// ── 상수 ───────────────────────────────────────────────────────────────────
const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? '(사)해외농업자원개발협회'
const A4 = { w: 595.28, h: 841.89 }
const ML = 48   // left margin
const MR = 48   // right margin
const CW = A4.w - ML - MR  // content width = 499.28

const C = {
  navy:       rgb(0.122, 0.286, 0.490),
  navyLight:  rgb(0.902, 0.945, 0.984),
  green:      rgb(0.106, 0.369, 0.125),
  greenLight: rgb(0.918, 0.953, 0.871),
  gray:       rgb(0.373, 0.369, 0.353),
  grayLight:  rgb(0.97,  0.97,  0.97),
  border:     rgb(0.784, 0.847, 0.910),
  white:      rgb(1, 1, 1),
  black:      rgb(0.10, 0.10, 0.10),
  dark:       rgb(0.20, 0.20, 0.20),
}

// ── 유틸 ───────────────────────────────────────────────────────────────────
function fmt(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

function clamp(text: string, font: PDFFont, size: number, maxW: number): string {
  let t = text
  while (font.widthOfTextAtSize(t, size) > maxW && t.length > 1)
    t = t.slice(0, -1)
  return t === text ? text : t + '…'
}

function tw(text: string, font: PDFFont, size: number) {
  return font.widthOfTextAtSize(text, size)
}

// ── 공통 그리기 ────────────────────────────────────────────────────────────
function hdr(page: ReturnType<PDFDocument['addPage']>, font: PDFFont,
             title: string, sub?: string) {
  // navy bar
  page.drawRectangle({ x: 0, y: A4.h - 38, width: A4.w, height: 38, color: C.navy })
  page.drawText(ORG, { x: ML, y: A4.h - 13, size: 7, font, color: rgb(1,1,1,) , opacity: 0.65 })
  page.drawText(title, { x: ML, y: A4.h - 27, size: 12, font, color: C.white })
  if (sub) page.drawText(sub, { x: ML + tw(title, font, 12) + 8, y: A4.h - 27, size: 8, font, color: rgb(1,1,1), opacity: 0.6 })
}

function ftr(page: ReturnType<PDFDocument['addPage']>, font: PDFFont, n: number) {
  page.drawLine({ start: { x: ML, y: 38 }, end: { x: A4.w - MR, y: 38 }, thickness: 0.4, color: C.border })
  page.drawText(ORG, { x: ML, y: 26, size: 7, font, color: C.gray })
  const pTxt = `${n} / 3`
  page.drawText(pTxt, { x: A4.w - MR - tw(pTxt, font, 7), y: 26, size: 7, font, color: C.gray })
}

function rowLine(page: ReturnType<PDFDocument['addPage']>, y: number) {
  page.drawLine({ start: { x: ML, y }, end: { x: A4.w - MR, y }, thickness: 0.4, color: C.border })
}

// ── 페이지 1: 표지 ─────────────────────────────────────────────────────────
function buildPage1(doc: PDFDocument, font: PDFFont, d: BuildData) {
  const page = doc.addPage([A4.w, A4.h])

  hdr(page, font, d.surveyTitle, `제${d.roundNo}회차`)
  ftr(page, font, 1)

  let y = A4.h - 38 - 28

  // 대제목
  const title = 'AHP 전문가 설문 응답 확인서'
  const titleW = tw(title, font, 18)
  page.drawText(title, { x: (A4.w - titleW) / 2, y, size: 18, font, color: C.navy })
  y -= 18

  // 부제목
  const sub = '해농공매 물량 배분 평가항목 가중치 산출'
  const subW = tw(sub, font, 9)
  page.drawText(sub, { x: (A4.w - subW) / 2, y, size: 9, font, color: C.gray })
  y -= 14

  // 구분선
  page.drawLine({ start: { x: ML, y }, end: { x: A4.w - MR, y }, thickness: 1.2, color: C.navy })
  y -= 18

  // 응답자 정보 박스
  const boxH = 6 * 22 + 10
  // 박스 테두리
  page.drawRectangle({ x: ML, y: y - boxH, width: CW, height: boxH,
    borderColor: C.navy, borderWidth: 1.2, color: C.white })
  // 박스 헤더
  page.drawRectangle({ x: ML, y: y - 20, width: CW, height: 20, color: C.navyLight })
  const hdrTxt = '응  답  자  정  보'
  page.drawText(hdrTxt, { x: ML + 12, y: y - 14, size: 9, font, color: C.navy })
  y -= 20

  // 필드 행
  const fields: [string, string][] = [
    ['성      명', d.name],
    ['소  속  기  관', d.organization],
    ['직      위', d.position],
    ['전문가 구분', d.category],
    ['제 출  일 시', fmt(d.submittedAt)],
  ]

  for (const [label, val] of fields) {
    const rowY = y - 5
    page.drawText(label, { x: ML + 12, y: rowY, size: 9, font, color: C.gray })
    page.drawText(':', { x: ML + 90, y: rowY, size: 9, font, color: C.gray })
    page.drawText(clamp(val, font, 9, CW - 110), { x: ML + 100, y: rowY, size: 9, font, color: C.dark })
    y -= 22
    if (fields.indexOf([label, val] as [string, string]) < fields.length - 1)
      rowLine(page, y + 17)
  }

  y -= 10

  // 하단 발행 기관
  y = 130
  page.drawLine({ start: { x: ML, y: y + 16 }, end: { x: A4.w - MR, y: y + 16 }, thickness: 0.5, color: C.border })
  const issuer = ORG
  const issuerW = tw(issuer, font, 11)
  page.drawText(issuer, { x: (A4.w - issuerW) / 2, y: y - 2, size: 11, font, color: C.navy })
  const note = '본 확인서는 AHP 전문가 설문 응답 원본의 공식 기록입니다.'
  const noteW = tw(note, font, 8)
  page.drawText(note, { x: (A4.w - noteW) / 2, y: y - 18, size: 8, font, color: C.gray })
}

// ── 척도 행 그리기 ─────────────────────────────────────────────────────────
function drawScale(
  page: ReturnType<PDFDocument['addPage']>,
  font: PDFFont,
  x: number, y: number, raw: number,
  aLabel: string, bLabel: string
) {
  const btnW = 19, btnH = 19, gap = 2
  const totalBtnsW = 17 * btnW + 16 * gap  // 323
  const lblW = 56
  const spacing = 6
  const rowH = btnH + 2

  // 레이블
  const aClipped = clamp(aLabel, font, 7.5, lblW)
  const aLblW = tw(aClipped, font, 7.5)
  page.drawText(aClipped, {
    x: x + lblW - aLblW,
    y: y + (rowH - 8) / 2 - 1,
    size: 7.5, font,
    color: raw > 0 ? C.navy : C.gray,
  })

  const bClipped = clamp(bLabel, font, 7.5, lblW)
  page.drawText(bClipped, {
    x: x + lblW + spacing + totalBtnsW + spacing,
    y: y + (rowH - 8) / 2 - 1,
    size: 7.5, font,
    color: raw < 0 ? C.green : C.gray,
  })

  // 버튼 17개: 왼쪽[9,8,7,6,5,4,3,2], 중앙[1], 오른쪽[2,3,4,5,6,7,8,9]
  const leftVals  = [9, 8, 7, 6, 5, 4, 3, 2]
  const rightVals = [2, 3, 4, 5, 6, 7, 8, 9]
  const allVals   = [...leftVals, 0, ...rightVals]  // 0 = center (value 1)

  let bx = x + lblW + spacing
  for (let i = 0; i < 17; i++) {
    const v = allVals[i]
    const isCenter = v === 0
    const isSel = isCenter ? raw === 0 : (i < 8 ? raw === v : raw === -v)
    const bgColor = isSel
      ? (i < 8 ? C.navy : i === 8 ? C.gray : C.green)
      : i % 2 === 0 ? C.white : C.grayLight

    const bW = isCenter ? btnW + 2 : btnW
    page.drawRectangle({ x: bx, y, width: bW, height: btnH,
      color: bgColor, borderColor: isSel ? bgColor : C.border, borderWidth: 0.6 })

    const label = isCenter ? '1' : String(v)
    const lSize = isCenter ? 8 : 7
    const lW = tw(label, font, lSize)
    page.drawText(label, {
      x: bx + (bW - lW) / 2,
      y: y + (btnH - lSize) / 2,
      size: lSize, font,
      color: isSel ? C.white : C.gray,
    })

    bx += (isCenter ? bW + 2 : bW) + gap
  }
}

// ── 의미 텍스트 ────────────────────────────────────────────────────────────
function getMeaning(raw: number, a: string, b: string): string {
  if (raw === 0) return `"${a}"와 "${b}"은 동등하게 중요합니다`
  if (raw > 0)   return `"${a}"이 "${b}"보다 ${raw}배 더 중요합니다`
  return `"${b}"이 "${a}"보다 ${Math.abs(raw)}배 더 중요합니다`
}

// ── 페이지 2: 설문 응답 ────────────────────────────────────────────────────
async function buildPage2(
  doc: PDFDocument,
  font: PDFFont,
  d: BuildData
) {
  const page = doc.addPage([A4.w, A4.h])
  hdr(page, font, '설문 응답 원본', `${d.name} 귀하`)
  ftr(page, font, 2)

  let y = A4.h - 38 - 14

  // 6개 문항
  for (const pair of PAIRS4) {
    const ans   = d.answers.find(a => a.questionCode === pair.code)
    const raw   = ans?.rawValue ?? 0
    const aItem = ITEMS4[pair.a]
    const bItem = ITEMS4[pair.b]
    const aLabel = aItem.label
    const bLabel = bItem.label
    const qH = 18 + 26 + 16  // header + scale + meaning

    // 카드 배경 (경계)
    page.drawRectangle({ x: ML, y: y - qH, width: CW, height: qH,
      borderColor: C.border, borderWidth: 0.7, color: C.white })

    // 문항 헤더
    page.drawRectangle({ x: ML, y: y - 18, width: CW, height: 18, color: C.navyLight })
    // 코드 뱃지
    page.drawRectangle({ x: ML + 8, y: y - 15, width: 22, height: 13,
      color: C.navy, borderWidth: 0 })
    page.drawText(pair.code, { x: ML + 9, y: y - 12, size: 7.5, font, color: C.white })
    // A vs B 레이블
    const aT = clamp(aLabel, font, 8.5, 130)
    page.drawText(aT, { x: ML + 36, y: y - 12, size: 8.5, font, color: C.navy })
    const vsX = ML + 36 + tw(aT, font, 8.5) + 5
    page.drawText('vs', { x: vsX, y: y - 12, size: 7.5, font, color: C.gray })
    const bT = clamp(bLabel, font, 8.5, 130)
    page.drawText(bT, { x: vsX + tw('vs', font, 7.5) + 5, y: y - 12, size: 8.5, font, color: C.green })
    y -= 18

    // 척도 행
    drawScale(page, font, ML + 4, y - 24, raw, aLabel, bLabel)
    y -= 26

    // 의미 행
    const meanBg = raw > 0 ? C.navyLight : raw < 0 ? C.greenLight : C.grayLight
    page.drawRectangle({ x: ML, y: y - 15, width: CW, height: 15, color: meanBg })
    const meaning = getMeaning(raw, aLabel, bLabel)
    const mColor  = raw > 0 ? C.navy : raw < 0 ? C.green : C.gray
    page.drawText(clamp(meaning, font, 8, CW - 16), { x: ML + 8, y: y - 11, size: 8, font, color: mColor })
    y -= 16

    y -= 6  // gap between cards
  }

  // 서명 섹션
  y -= 6
  page.drawLine({ start: { x: ML, y }, end: { x: A4.w - MR, y }, thickness: 1.5, color: C.navy })
  y -= 16

  const sigTitle = '응  답  자  서  명'
  page.drawText(sigTitle, { x: ML, y, size: 10, font, color: C.navy })
  y -= 14

  // 서명 박스
  const sigW = 200, sigH = 80
  page.drawRectangle({ x: ML, y: y - sigH, width: sigW, height: sigH,
    borderColor: C.navy, borderWidth: 1.2, color: C.white })

  if (d.signatureDataUrl) {
    try {
      const b64 = d.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '')
      const imgBytes = Buffer.from(b64, 'base64')
      const img = await doc.embedPng(imgBytes)
      const dims = img.scaleToFit(sigW - 8, sigH - 8)
      page.drawImage(img, {
        x: ML + 4 + (sigW - 8 - dims.width) / 2,
        y: y - sigH + (sigH - 8 - dims.height) / 2 + 4,
        width: dims.width, height: dims.height,
      })
    } catch { /* 서명 이미지 오류 무시 */ }
  } else {
    const noSig = '서  명  없  음'
    const nsW = tw(noSig, font, 9)
    page.drawText(noSig, { x: ML + (sigW - nsW) / 2, y: y - sigH / 2 - 4, size: 9, font, color: C.border })
  }

  // 서명 메타
  const mx = ML + sigW + 14
  page.drawText('서 명 자 :', { x: mx, y: y - 16, size: 8.5, font, color: C.gray })
  page.drawText(d.name, { x: mx + 58, y: y - 16, size: 8.5, font, color: C.dark })
  page.drawText('서명 일시 :', { x: mx, y: y - 32, size: 8.5, font, color: C.gray })
  page.drawText(fmt(d.signedAt), { x: mx + 58, y: y - 32, size: 8.5, font, color: C.dark })
}

// ── 페이지 3: 제출 증빙 ────────────────────────────────────────────────────
function buildPage3(doc: PDFDocument, font: PDFFont, d: BuildData) {
  const page = doc.addPage([A4.w, A4.h])
  hdr(page, font, '제출 증빙')
  ftr(page, font, 3)

  let y = A4.h - 38 - 18

  // ─ 제출 기록 카드 ─
  const cardHdrH = 22
  page.drawRectangle({ x: ML, y: y - cardHdrH, width: CW, height: cardHdrH, color: C.navy })
  page.drawText('제출 기록', { x: ML + 10, y: y - 15, size: 9.5, font, color: C.white })
  y -= cardHdrH

  const logRows: [string, string, boolean][] = d.submissionLog ? [
    ['응답자 ID',       d.respondentId,                         true ],
    ['제  출  일  시',  fmt(d.submissionLog.submittedAt),       false],
    ['I P  주  소',     d.submissionLog.ipAddress,              true ],
    ['브라우저/기기',   d.submissionLog.userAgent,              false],
  ] : [['—', '제출 기록 없음', false]]

  const rowH = 20
  const tableH = logRows.length * rowH
  page.drawRectangle({ x: ML, y: y - tableH, width: CW, height: tableH,
    borderColor: C.border, borderWidth: 0.7, color: C.white })

  for (let i = 0; i < logRows.length; i++) {
    const [label, val, mono] = logRows[i]
    const rowY = y - (i + 1) * rowH
    if (i % 2 === 1)
      page.drawRectangle({ x: ML, y: rowY, width: CW, height: rowH, color: rgb(0.97, 0.98, 1) })
    if (i > 0)
      page.drawLine({ start: { x: ML, y: rowY + rowH }, end: { x: A4.w - MR, y: rowY + rowH },
        thickness: 0.4, color: C.border })
    page.drawText(label, { x: ML + 10, y: rowY + 5, size: 8.5, font, color: C.gray })
    const maxValW = CW - 110
    page.drawText(clamp(val, font, mono ? 7.5 : 8.5, maxValW),
      { x: ML + 108, y: rowY + 5, size: mono ? 7.5 : 8.5, font, color: C.dark })
  }
  y -= tableH + 14

  // ─ 해시 카드 ─
  page.drawRectangle({ x: ML, y: y - cardHdrH, width: CW, height: cardHdrH, color: C.navy })
  page.drawText('데이터 무결성 (SHA-256)', { x: ML + 10, y: y - 15, size: 9.5, font, color: C.white })
  y -= cardHdrH

  const hash  = d.submissionLog?.dataHash ?? '—'
  const half  = Math.ceil(hash.length / 2)
  const line1 = hash.slice(0, half)
  const line2 = hash.slice(half)
  const hashH = 42
  page.drawRectangle({ x: ML, y: y - hashH, width: CW, height: hashH,
    borderColor: C.border, borderWidth: 0.7, color: rgb(0.97, 0.98, 1) })
  page.drawText(line1, { x: ML + 10, y: y - 14, size: 7.5, font, color: C.dark })
  page.drawText(line2, { x: ML + 10, y: y - 28, size: 7.5, font, color: C.dark })
  y -= hashH + 18

  // ─ 유의사항 ─
  const notices = [
    '본 확인서는 응답자의 전자서명이 포함된 원본 기록입니다.',
    '제출된 응답 데이터는 SHA-256 해시로 무결성이 보장됩니다.',
    '가중치 및 CR 등 분석 결과는 이 문서에 포함되지 않습니다.',
    '본 자료는 해농공매 물량 배분 가중치 산출 목적으로만 사용됩니다.',
  ]
  for (const n of notices) {
    page.drawText('•', { x: ML, y, size: 8.5, font, color: C.navy })
    page.drawText(n, { x: ML + 10, y, size: 8.5, font, color: C.gray })
    y -= 16
  }
}

// ── 메인 ───────────────────────────────────────────────────────────────────
interface BuildData {
  respondentId: string
  name: string
  organization: string
  position: string
  category: string
  submittedAt: Date | null
  roundNo: number
  surveyTitle: string
  answers: { questionCode: string; rawValue: number }[]
  signatureDataUrl: string | null
  signedAt: Date | null
  submissionLog: {
    ipAddress: string
    userAgent: string
    submittedAt: Date
    dataHash: string
  } | null
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

  const d: BuildData = {
    respondentId,
    name:           respondent.name,
    organization:   respondent.organization,
    position:       respondent.position,
    category:       respondent.category,
    submittedAt:    respondent.submittedAt,
    roundNo:        respondent.round.roundNo,
    surveyTitle:    respondent.round.survey.title,
    answers:        respondent.answers.map(a => ({ questionCode: a.questionCode, rawValue: Number(a.rawValue) })),
    signatureDataUrl: respondent.signature?.imageData ?? null,
    signedAt:       respondent.signature?.signedAt ?? null,
    submissionLog:  respondent.submissionLog ? {
      ipAddress:   respondent.submissionLog.ipAddress,
      userAgent:   respondent.submissionLog.userAgent,
      submittedAt: respondent.submissionLog.submittedAt,
      dataHash:    respondent.submissionLog.dataHash,
    } : null,
  }

  const doc  = await PDFDocument.create()
  const font = await loadKoreanFont(doc)

  buildPage1(doc, font, d)
  await buildPage2(doc, font, d)
  buildPage3(doc, font, d)

  const pdfBytes = await doc.save()
  return new Uint8Array(pdfBytes)
}
