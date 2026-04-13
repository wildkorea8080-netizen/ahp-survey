import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 기존 데이터 정리 (개발 환경)
  await prisma.groupResult.deleteMany()
  await prisma.cRAdjustment.deleteMany()
  await prisma.individualResult.deleteMany()
  await prisma.submissionLog.deleteMany()
  await prisma.signature.deleteMany()
  await prisma.answer.deleteMany()
  await prisma.respondent.deleteMany()
  await prisma.surveyRound.deleteMany()
  await prisma.survey.deleteMany()

  // Survey 생성
  const survey = await prisma.survey.create({
    data: {
      title: '해농공매 물량 배분 AHP 전문가 설문',
      description:
        '해농공매 물량 배분 평가항목(투자규모, 영농규모, 영농기간, 반입기여도)의 ' +
        '상대적 중요도를 AHP(계층분석법)로 산출하기 위한 전문가 설문입니다.',
      locale: 'ko',
    },
  })
  console.log(`✅ Survey created: ${survey.id}`)

  // SurveyRound 생성
  const round = await prisma.surveyRound.create({
    data: {
      surveyId: survey.id,
      roundNo: 1,
      token: 'haenong-2026-r1',
      targetCount: 16,
    },
  })
  console.log(`✅ SurveyRound created: token=${round.token}`)

  console.log('🎉 Seed completed!')
  console.log(`   Survey URL: /survey/${round.token}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
