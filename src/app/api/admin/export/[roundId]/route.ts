import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { generateExcel } from '@/lib/excel/generateExcel'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 401 })
  }

  const { roundId } = await params

  try {
    const buffer = await generateExcel(roundId)
    const filename = `ahp-export-${roundId}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '오류가 발생했습니다'
    const status = message.includes('찾을 수 없습니다') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
