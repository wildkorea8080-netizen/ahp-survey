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

        <div className="space-y-4 text-sm">
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
