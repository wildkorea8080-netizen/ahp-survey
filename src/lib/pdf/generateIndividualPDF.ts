/**
 * 응답자 개별 확인서 PDF 생성 (Puppeteer + HTML/CSS)
 * CLAUDE.md 절대 원칙 #3: 응답자 PDF에 분석 결과(가중치/CR) 포함 금지
 */

import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'

// @sparticuz/chromium-min: 바이너리를 런타임에 다운로드 (Vercel 번들 크기 초과 방지)
const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
import { buildPdfHtml } from './buildPdfHtml'
import { prisma } from '@/lib/prisma'

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

  const html = buildPdfHtml({
    respondentId,
    name: respondent.name,
    organization: respondent.organization,
    position: respondent.position,
    category: respondent.category,
    submittedAt: respondent.submittedAt,
    roundNo: respondent.round.roundNo,
    surveyTitle: respondent.round.survey.title,
    answers: respondent.answers.map((a) => ({
      questionCode: a.questionCode,
      rawValue: Number(a.rawValue),
    })),
    signatureDataUrl: respondent.signature?.imageData ?? null,
    signedAt: respondent.signature?.signedAt ?? null,
    submissionLog: respondent.submissionLog
      ? {
          ipAddress: respondent.submissionLog.ipAddress,
          userAgent: respondent.submissionLog.userAgent,
          submittedAt: respondent.submissionLog.submittedAt,
          dataHash: respondent.submissionLog.dataHash,
        }
      : null,
  })

  // 로컬 개발: CHROME_EXECUTABLE_PATH 환경변수 설정 필요
  // Vercel: @sparticuz/chromium이 자동으로 바이너리 경로 제공
  const executablePath =
    process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath(CHROMIUM_URL))

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1240, height: 1754 },
    executablePath,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    // Google Fonts 로딩 완료까지 대기
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return new Uint8Array(pdfBuffer)
  } finally {
    await browser.close()
  }
}
