'use client'

import { PAIRS4, ITEMS4 } from '@/lib/ahp/calculator'
import { tSurvey } from '@/lib/i18n'

interface Props {
  questionIndex: number  // 0~5
  answers: { questionCode: string; rawValue: number }[]
  onSelect: (questionCode: string, rawValue: number) => void
}

// rawValue → 선택된 버튼 위치 변환
// 좌측: +1~+9 (버튼 위치 왼쪽), 중앙: 0, 우측: -1~-9 (버튼 위치 오른쪽)
// 버튼 배열: [-9,-8,-7,-6,-5,-4,-3,-2,-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
// → UI 순서 좌→우: 9,8,7,6,5,4,3,2,1(center),2,3,4,5,6,7,8,9
// 좌 n: rawValue=+n, 우 n: rawValue=-n

const LEFT_VALUES  = [9, 8, 7, 6, 5, 4, 3, 2]   // 좌측 버튼 rawValue (큰→작 순)
const CENTER_VALUE = 0                             // 동등
const RIGHT_VALUES = [2, 3, 4, 5, 6, 7, 8, 9]   // 우측 버튼 rawValue (절댓값, 저장시 음수)

function getScaleLabel(raw: number): string {
  const tS = tSurvey
  const abs = Math.abs(raw)
  if (abs === 0 || abs === 1) return tS('scale.equal')
  if (abs <= 2) return tS('scale.slightly')
  if (abs <= 4) return tS('scale.moderate')
  if (abs <= 6) return tS('scale.strong')
  return tS('scale.extreme')
}

export default function PairwiseQuestion({ questionIndex, answers, onSelect }: Props) {
  const pair = PAIRS4[questionIndex]
  if (!pair) return null

  const itemA = ITEMS4[pair.a]
  const itemB = ITEMS4[pair.b]
  const currentAnswer = answers.find((a) => a.questionCode === pair.code)
  const selectedRaw = currentAnswer?.rawValue ?? null

  // 현재 선택의 의미 텍스트
  function getMeaningText(): string | null {
    if (selectedRaw === null) return null
    if (selectedRaw === 0) return `"${itemA.label}"와 "${itemB.label}"은 동등하게 중요합니다`
    if (selectedRaw > 0) return `"${itemA.label}"이 "${itemB.label}"보다 ${getScaleLabel(selectedRaw)}`
    return `"${itemB.label}"이 "${itemA.label}"보다 ${getScaleLabel(selectedRaw)}`
  }

  return (
    <div className="space-y-4">
      {/* 진행 표시 */}
      <div className="flex items-center justify-between text-sm text-[#5F5E5A]">
        <span>문항 {questionIndex + 1} / 6</span>
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-6 rounded-full transition-colors ${
                i < questionIndex
                  ? 'bg-[#1B5E20]'
                  : i === questionIndex
                  ? 'bg-[#1F497D]'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 비교 질문 */}
      <div className="rounded-lg bg-[#E6F1FB] p-4 text-center text-sm text-[#1F497D]">
        두 항목의 상대적 중요도를 비교하여 선택해 주세요
      </div>

      {/* 쌍대비교 UI */}
      <div className="flex items-center gap-2">
        {/* 좌측 항목 */}
        <div className="w-20 shrink-0 text-center">
          <div
            className="rounded-lg px-2 py-3 text-xs font-bold leading-tight"
            style={{ backgroundColor: '#E6F1FB', color: '#1F497D' }}
          >
            {itemA.label}
          </div>
        </div>

        {/* 버튼 그리드 */}
        <div className="flex flex-1 items-center justify-center gap-0.5">
          {/* 좌측 버튼 (9→2, rawValue 양수) */}
          {LEFT_VALUES.map((val) => {
            const isSelected = selectedRaw === val
            return (
              <button
                key={`L${val}`}
                onClick={() => onSelect(pair.code, val)}
                className={`flex items-center justify-center rounded-full text-xs font-semibold transition-all
                  ${val === 9 || val === 8 ? 'h-8 w-8' : 'h-8 w-8'}
                  ${isSelected
                    ? 'scale-110 text-white shadow-md'
                    : 'border border-gray-300 bg-white text-[#5F5E5A] hover:border-[#1F497D] hover:bg-[#E6F1FB]'
                  }`}
                style={isSelected ? { backgroundColor: '#1F497D' } : {}}
                title={`좌측이 ${val}배 중요`}
              >
                {val}
              </button>
            )
          })}

          {/* 중앙 버튼 (동등, rawValue=0) */}
          <button
            onClick={() => onSelect(pair.code, 0)}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all
              ${selectedRaw === 0
                ? 'scale-110 bg-[#5F5E5A] text-white shadow-md'
                : 'border-2 border-gray-400 bg-white text-[#5F5E5A] hover:bg-gray-100'
              }`}
            title="동등하게 중요"
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
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all
                  ${isSelected
                    ? 'scale-110 text-white shadow-md'
                    : 'border border-gray-300 bg-white text-[#5F5E5A] hover:border-[#1B5E20] hover:bg-[#EAF3DE]'
                  }`}
                style={isSelected ? { backgroundColor: '#1B5E20' } : {}}
                title={`우측이 ${val}배 중요`}
              >
                {val}
              </button>
            )
          })}
        </div>

        {/* 우측 항목 */}
        <div className="w-20 shrink-0 text-center">
          <div
            className="rounded-lg px-2 py-3 text-xs font-bold leading-tight"
            style={{ backgroundColor: '#EAF3DE', color: '#1B5E20' }}
          >
            {itemB.label}
          </div>
        </div>
      </div>

      {/* 선택 의미 텍스트 */}
      <div className="min-h-[40px] rounded-lg bg-gray-50 px-4 py-2 text-center text-sm">
        {getMeaningText() ? (
          <p className="font-medium text-[#1F497D]">{getMeaningText()}</p>
        ) : (
          <p className="text-[#5F5E5A]">위 버튼을 선택하여 중요도를 표시해 주세요</p>
        )}
      </div>
    </div>
  )
}
