'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import RespondentForm from '@/components/survey/RespondentForm'
import SurveyGuide from '@/components/survey/SurveyGuide'
import PairwiseQuestion from '@/components/survey/PairwiseQuestion'
import SignatureStep from '@/components/survey/SignatureStep'
import { PAIRS4 } from '@/lib/ahp/calculator'

type Step = 'info' | 'guide' | 'questions' | 'signature' | 'complete'

interface RespondentData {
  name: string
  organization: string
  position: string
  category: string
}

interface Props {
  token: string
}

export default function SurveyClient({ token }: Props) {
  const [step, setStep] = useState<Step>('info')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [respondentData, setRespondentData] = useState<RespondentData | null>(null)
  const [answers, setAnswers] = useState<{ questionCode: string; rawValue: number }[]>([])
  const [respondentId, setRespondentId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 현재 문항에 답변했는지 확인
  const currentPair = PAIRS4[questionIndex]
  const currentAnswered = answers.some((a) => a.questionCode === currentPair?.code)
  const allAnswered = PAIRS4.every((p) => answers.some((a) => a.questionCode === p.code))

  function handleSelectAnswer(questionCode: string, rawValue: number) {
    setAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionCode !== questionCode)
      return [...filtered, { questionCode, rawValue }]
    })
  }

  function handleNextQuestion() {
    if (questionIndex < PAIRS4.length - 1) {
      setQuestionIndex((i) => i + 1)
    } else {
      setStep('signature')
    }
  }

  function handlePrevQuestion() {
    if (questionIndex > 0) {
      setQuestionIndex((i) => i - 1)
    } else {
      setStep('guide')
    }
  }

  async function handleSubmit(signatureDataUrl: string) {
    if (!respondentData) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          respondent: respondentData,
          answers,
          signatureDataUrl,
        }),
      })

      const body = await res.json() as { respondentId?: string; error?: string }

      if (!res.ok) {
        setSubmitError(body.error ?? '제출 중 오류가 발생했습니다')
        return
      }

      setRespondentId(body.respondentId ?? null)
      setStep('complete')
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── 스텝별 렌더링 ───────────────────────────────────────────────

  if (step === 'info') {
    return (
      <RespondentForm
        onNext={(data) => {
          setRespondentData(data)
          setStep('guide')
        }}
      />
    )
  }

  if (step === 'guide') {
    return <SurveyGuide onNext={() => setStep('questions')} />
  }

  if (step === 'questions') {
    return (
      <div className="space-y-6">
        <PairwiseQuestion
          questionIndex={questionIndex}
          answers={answers}
          onSelect={handleSelectAnswer}
        />

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrevQuestion}
            className="flex-1"
          >
            ← 이전
          </Button>
          <Button
            onClick={handleNextQuestion}
            disabled={!currentAnswered}
            className="flex-1 text-white"
            style={{ backgroundColor: currentAnswered ? '#1F497D' : '#9ca3af' }}
          >
            {questionIndex < PAIRS4.length - 1 ? '다음 →' : '서명으로 →'}
          </Button>
        </div>

        {/* 전체 진행률 */}
        <p className="text-center text-xs text-[#5F5E5A]">
          응답 완료: {answers.length} / {PAIRS4.length}문항
        </p>
      </div>
    )
  }

  if (step === 'signature') {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => {
            setStep('questions')
            setQuestionIndex(PAIRS4.length - 1)
          }}
          className="text-sm"
        >
          ← 응답 수정
        </Button>
        <SignatureStep
          answers={answers}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
        {submitError && (
          <p className="text-center text-sm text-[#C62828]">{submitError}</p>
        )}
      </div>
    )
  }

  // complete
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-16 text-center">
      <div className="text-6xl">✅</div>
      <h2 className="text-2xl font-bold text-[#1B5E20]">설문이 제출되었습니다</h2>
      <p className="text-[#5F5E5A]">
        소중한 응답에 감사드립니다.
        <br />
        응답 내용은 해농공매 물량 배분 가중치 산출에 활용됩니다.
      </p>
      {respondentId && (
        <p className="rounded-lg bg-gray-100 px-4 py-2 font-mono text-xs text-[#5F5E5A]">
          응답 ID: {respondentId}
        </p>
      )}
    </div>
  )
}
