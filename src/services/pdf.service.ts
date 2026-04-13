/**
 * PDF 생성 서비스 레이어
 * 2단계에서 다국어 확장 대비 — lib 함수를 얇게 감싼다
 */

import { generateIndividualPDF as _generateIndividualPDF } from '@/lib/pdf/generateIndividualPDF'
import { generateReportPDF as _generateReportPDF } from '@/lib/pdf/generateReportPDF'

export async function generateIndividualPDF(respondentId: string): Promise<Uint8Array> {
  return _generateIndividualPDF(respondentId)
}

export async function generateReportPDF(
  roundId: string,
  itemCount: 4 | 3
): Promise<Uint8Array> {
  return _generateReportPDF(roundId, itemCount)
}
