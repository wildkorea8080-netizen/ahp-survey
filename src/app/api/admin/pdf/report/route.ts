import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { generateReportPDF } from '@/services/pdf.service'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 401 })
  }

  const { roundId, itemCount } = await req.json() as {
    roundId: string
    itemCount: 4 | 3
  }

  if (!roundId) {
    return NextResponse.json({ error: 'roundId가 필요합니다' }, { status: 400 })
  }
  if (itemCount !== 4 && itemCount !== 3) {
    return NextResponse.json({ error: 'itemCount는 4 또는 3이어야 합니다' }, { status: 400 })
  }

  try {
    const pdfBytes = await generateReportPDF(roundId, itemCount)
    const filename = `report-${itemCount}items-${roundId}.pdf`

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBytes.length),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '오류가 발생했습니다'
    const status = message.includes('찾을 수 없습니다') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
