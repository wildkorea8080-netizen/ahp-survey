'use client'

import { PAIRS4, ITEMS4 } from '@/lib/ahp/calculator'
import { tSurvey } from '@/lib/i18n'

interface Props {
  questionIndex: number
  answers: { questionCode: string; rawValue: number }[]
  onSelect: (questionCode: string, rawValue: number) => void
}

const LEFT_VALUES  = [9, 8, 7, 6, 5, 4, 3, 2]
const RIGHT_VALUES = [2, 3, 4, 5, 6, 7, 8, 9]

function getScaleLabel(raw: number): string {
  const abs = Math.abs(raw)
  if (abs === 0 || abs === 1) return tSurvey('scale.equal')
  if (abs <= 2) return tSurvey('scale.slightly')
  if (abs <= 4) return tSurvey('scale.moderate')
  if (abs <= 6) return tSurvey('scale.strong')
  return tSurvey('scale.extreme')
}

export default function PairwiseQuestion({ questionIndex, answers, onSelect }: Props) {
  const pair = PAIRS4[questionIndex]
  if (!pair) return null

  const itemA = ITEMS4[pair.a]
  const itemB = ITEMS4[pair.b]
  const currentAnswer = answers.find((a) => a.questionCode === pair.code)
  const selectedRaw = currentAnswer?.rawValue ?? null

  function getMeaningText(): string | null {
    if (selectedRaw === null) return null
    if (selectedRaw === 0) return `"${itemA.label}"와 "${itemB.label}"은 동등하게 중요합니다`
    if (selectedRaw > 0) return `"${itemA.label}"이 "${itemB.label}"보다 ${getScaleLabel(selectedRaw)}`
    return `"${itemB.label}"이 "${itemA.label}"보다 ${getScaleLabel(selectedRaw)}`
  }

  return (
    <div className="space-y-3">
      {/* 진행 표시 */}
      <div className="flex items-center justify-between text-sm text-[#5F5E5A]">
        <span>문항 {questionIndex + 1} / 6</span>
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-6 rounded-full transition-colors ${
                i < questionIndex ? 'bg-[#1B5E20]'
                : i === questionIndex ? 'bg-[#1F497D]'
                : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 안내 */}
      <div className="rounded-lg bg-[#E6F1FB] px-3 py-2 text-center text-xs text-[#1F497D]">
        두 항목의 상대적 중요도를 비교하여 선택해 주세요
      </div>

      {/* 항목 라벨 (모바일: 좌우 나란히) */}
      <div className="flex items-stretch gap-2">
        <div className="flex-1 rounded-lg px-2 py-3 text-center text-sm font-bold"
          style={{ backgroundColor: '#E6F1FB', color: '#1F497D' }}>
          {itemA.label}
        </div>
        <div className="flex items-center text-xs text-gray-400">vs</div>
        <div className="flex-1 rounded-lg px-2 py-3 text-center text-sm font-bold"
          style={{ backgroundColor: '#EAF3DE', color: '#1B5E20' }}>
          {itemB.label}
        </div>
      </div>

      {/* 방향 안내 */}
      <div className="flex justify-between px-1 text-[10px] text-gray-400">
        <span>← {itemA.label} 더 중요</span>
        <span>{itemB.label} 더 중요 →</span>
      </div>

      {/* 버튼 행 — flex-1로 가로폭 균등 분배 */}
      <div className="flex w-full items-center">
        {/* 좌측 버튼 (9→2, rawValue 양수) */}
        {LEFT_VALUES.map((val) => {
          const isSelected = selectedRaw === val
          return (
            <button
              key={`L${val}`}
              onClick={() => onSelect(pair.code, val)}
              className={`flex flex-1 items-center justify-center rounded-l-sm border-y border-l py-2 text-xs font-semibold transition-all active:scale-95
                ${isSelected
                  ? 'border-[#1F497D] text-white'
                  : 'border-gray-300 bg-white text-[#5F5E5A]'
                }`}
              style={isSelected ? { backgroundColor: '#1F497D' } : {}}
            >
              {val}
            </button>
          )
        })}

        {/* 중앙 버튼 (동등) */}
        <button
          onClick={() => onSelect(pair.code, 0)}
          className={`flex w-10 shrink-0 items-center justify-center border py-3 text-sm font-bold transition-all active:scale-95
            ${selectedRaw === 0
              ? 'border-[#5F5E5A] bg-[#5F5E5A] text-white'
              : 'border-gray-400 bg-white text-[#5F5E5A]'
            }`}
        >
          1
        </button>

        {/* 우측 버튼 (2→9, rawValue 음수) */}
        {RIGHT_VALUES.map((val) => {
          const rawVal = -val
          const isSelected = selectedRaw === rawVal
          return (
            <button
              key={`R${val}`}
              onClick={() => onSelect(pair.code, rawVal)}
              className={`flex flex-1 items-center justify-center border-y border-r py-2 text-xs font-semibold transition-all active:scale-95
                ${isSelected
                  ? 'border-[#1B5E20] text-white'
                  : 'border-gray-300 bg-white text-[#5F5E5A]'
                }`}
              style={isSelected ? { backgroundColor: '#1B5E20' } : {}}
            >
              {val}
            </button>
          )
        })}
      </div>

      {/* 선택 의미 */}
      <div className="min-h-[36px] rounded-lg bg-gray-50 px-3 py-2 text-center text-sm">
        {getMeaningText()
          ? <p className="font-medium text-[#1F497D]">{getMeaningText()}</p>
          : <p className="text-[#5F5E5A]">위 버튼을 선택하여 중요도를 표시해 주세요</p>
        }
      </div>
    </div>
  )
}
