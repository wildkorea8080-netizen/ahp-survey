'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ITEMS4, ITEMS3 } from '@/lib/ahp/calculator'
import type { ResponseRow } from './ResponseTable'

interface Props {
  respondent: ResponseRow
  onClose: () => void
}

export default function DetailModal({ respondent, onClose }: Props) {
  const w = respondent.result?.weights as {
    weights4?: number[]
    weights3?: number[]
    score200_4?: number[]
    score300_4?: number[]
    score200_3?: number[]
    score300_3?: number[]
  } | undefined

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#1F497D]">
            응답 상세 — {respondent.name} ({respondent.organization})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-1">
          {/* 제출 로그 */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-[#E6F1FB] px-3 py-2">
              <h3 className="font-semibold text-[#1F497D]">📋 제출 로그</h3>
            </div>
            <table className="w-full text-xs">
              <tbody>
                <LogRow label="응답 시간" value={
                  respondent.submittedAt
                    ? new Date(respondent.submittedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
                    : '—'
                } />
                <LogRow label="서명 시각" value={
                  respondent.signedAt
                    ? new Date(respondent.signedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
                    : '—'
                } />
                <LogRow label="IP 주소" value={respondent.submissionLog?.ipAddress ?? '—'} />
                <LogRow label="인증 여부" value={respondent.isLocked ? '✅ 제출 완료 (잠김)' : '미완료'} />
                <LogRow label="기기 정보" value={respondent.submissionLog?.userAgent ?? '—'} mono />
                <LogRow label="데이터 해시" value={respondent.submissionLog?.dataHash ?? '—'} mono truncate />
              </tbody>
            </table>
          </div>

          {/* 4개 항목 가중치 */}
          <div>
            <h3 className="mb-2 font-semibold text-[#1F497D]">▶ 4개 항목 가중치</h3>
            <WeightsTable
              items={ITEMS4}
              weights={w?.weights4}
              score200={w?.score200_4}
              score300={w?.score300_4}
              cr={respondent.result?.cr}
            />
          </div>

          {/* 3개 항목 가중치 */}
          <div>
            <h3 className="mb-2 font-semibold text-[#1B5E20]">▶ 3개 항목 가중치 (투자규모 제외)</h3>
            <WeightsTable
              items={ITEMS3}
              weights={w?.weights3}
              score200={w?.score200_3}
              score300={w?.score300_3}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LogRow({
  label,
  value,
  mono = false,
  truncate = false,
}: {
  label: string
  value: string
  mono?: boolean
  truncate?: boolean
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="w-24 shrink-0 px-3 py-2 font-medium text-[#5F5E5A]">{label}</td>
      <td className={`px-3 py-2 text-[#1F497D] break-all ${mono ? 'font-mono text-[10px]' : ''} ${truncate ? 'max-w-xs overflow-hidden' : ''}`}>
        {value}
      </td>
    </tr>
  )
}

function WeightsTable({
  items,
  weights,
  score200,
  score300,
  cr,
}: {
  items: readonly { key: string; label: string; color: string }[]
  weights?: number[]
  score200?: number[]
  score300?: number[]
  cr?: number
}) {
  if (!weights) return <p className="text-[#5F5E5A]">데이터 없음</p>

  return (
    <div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-3 py-2 text-left">항목</th>
            <th className="px-3 py-2 text-right">가중치</th>
            <th className="px-3 py-2 text-right">200점</th>
            <th className="px-3 py-2 text-right">300점</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.key} className="border-b">
              <td className="px-3 py-1.5 font-medium" style={{ color: item.color }}>
                {item.label}
              </td>
              <td className="px-3 py-1.5 text-right">{(weights[i] * 100).toFixed(2)}%</td>
              <td className="px-3 py-1.5 text-right">{score200?.[i]?.toFixed(2) ?? '—'}</td>
              <td className="px-3 py-1.5 text-right">{score300?.[i]?.toFixed(2) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {cr !== undefined && (
        <p className="mt-1 text-right text-xs text-[#5F5E5A]">
          CR = {cr.toFixed(4)} {cr <= 0.1 ? '✅' : '⚠'}
        </p>
      )}
    </div>
  )
}
