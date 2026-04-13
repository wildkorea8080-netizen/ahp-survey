import { NextRequest, NextResponse } from 'next/server'
import { generateIndividualPDF } from '@/services/pdf.service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ respondentId: string }> }
) {
  const { respondentId } = await params

  try {
    const pdfBytes = await generateIndividualPDF(respondentId)

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="individual-${respondentId}.pdf"`,
        'Content-Length': String(pdfBytes.length),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '오류가 발생했습니다'
    const status = message.includes('찾을 수 없습니다') ? 404
      : message.includes('제출되지 않은') ? 400
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}
