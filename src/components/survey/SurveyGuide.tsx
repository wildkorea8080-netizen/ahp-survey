'use client'

import { Button } from '@/components/ui/button'
import { tSurvey, tCommon } from '@/lib/i18n'
import { ITEMS4 } from '@/lib/ahp/calculator'

interface Props {
  onNext: () => void
}

const SCALE_ROWS = [
  { value: 1,  left: true,  label: '동등하게 중요' },
  { value: 3,  left: true,  label: '약간 더 중요' },
  { value: 5,  left: true,  label: '상당히 더 중요' },
  { value: 7,  left: true,  label: '매우 더 중요' },
  { value: 9,  left: true,  label: '절대적으로 더 중요' },
]

export default function SurveyGuide({ onNext }: Props) {
  const tS = tSurvey

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 설문 안내 헤더 */}
      <div className="rounded-lg bg-[#E6F1FB] p-5 text-center">
        <h2 className="text-lg font-bold text-[#1F497D]">{tS('intro.title')}</h2>
        <p className="mt-1 text-sm text-[#1F497D]">{tS('intro.subtitle')}</p>
      </div>

      {/* 설문 설명 */}
      <div className="rounded-lg border border-gray-200 p-4 text-sm text-[#5F5E5A] leading-relaxed">
        <p>{tS('intro.description')}</p>
        <p className="mt-2 font-medium text-[#1F497D]">{tS('intro.duration')}</p>
      </div>

      {/* 평가항목 정의 */}
      <div>
        <h3 className="mb-3 font-semibold text-[#1F497D]">📋 평가항목 정의</h3>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#E6F1FB]">
                <th className="px-4 py-2 text-left font-semibold text-[#1F497D] w-1/3">항목</th>
                <th className="px-4 py-2 text-left font-semibold text-[#1F497D]">정의</th>
              </tr>
            </thead>
            <tbody>
              {(['inv', 'farm', 'per', 'imp'] as const).map((key, idx) => (
                <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-medium" style={{ color: ITEMS4.find(i => i.key === key)?.color }}>
                    {tS(`items.${key}.label`)}
                  </td>
                  <td className="px-4 py-3 text-[#5F5E5A]">
                    {tS(`items.${key}.def`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 척도 기준표 */}
      <div>
        <h3 className="mb-3 font-semibold text-[#1F497D]">⚖️ 중요도 척도 기준 (1~9)</h3>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#E6F1FB]">
                <th className="px-4 py-2 text-center font-semibold text-[#1F497D] w-16">척도</th>
                <th className="px-4 py-2 text-left font-semibold text-[#1F497D]">의미 (좌측 항목 기준)</th>
              </tr>
            </thead>
            <tbody>
              {SCALE_ROWS.map((row, idx) => (
                <tr key={row.value} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 text-center font-bold text-[#1F497D]">{row.value}</td>
                  <td className="px-4 py-2 text-[#5F5E5A]">{row.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[#5F5E5A]">
          * 우측 항목이 더 중요하면 같은 척도를 우측 방향으로 선택하세요. (2,4,6,8: 중간 단계)
        </p>
      </div>

      <Button
        onClick={onNext}
        className="w-full bg-[#1F497D] hover:bg-[#17375E] text-white"
      >
        설문 시작하기 →
      </Button>
    </div>
  )
}
