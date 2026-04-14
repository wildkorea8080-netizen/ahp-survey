import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ respondentId: string }> },
) {
  const { respondentId } = await params

  const respondent = await prisma.respondent.findUnique({
    where: { id: respondentId },
    select: { id: true, name: true },
  })

  if (!respondent) {
    return NextResponse.json(
      { error: '응답자를 찾을 수 없습니다', code: 'NOT_FOUND' },
      { status: 404 },
    )
  }

  // Cascade: Answer, Signature, SubmissionLog, IndividualResult(→CRAdjustment) 자동 삭제
  await prisma.respondent.delete({ where: { id: respondentId } })

  return NextResponse.json({ ok: true, deleted: respondent.name })
}
