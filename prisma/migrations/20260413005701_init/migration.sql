-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "ownerId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyRound" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "roundNo" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'OPEN',
    "targetCount" INTEGER NOT NULL DEFAULT 16,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Respondent" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Respondent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "questionCode" TEXT NOT NULL,
    "itemA" TEXT NOT NULL,
    "itemB" TEXT NOT NULL,
    "rawValue" DOUBLE PRECISION NOT NULL,
    "matrixValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndividualResult" (
    "id" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "lambdaMax" DOUBLE PRECISION NOT NULL,
    "ci" DOUBLE PRECISION NOT NULL,
    "cr" DOUBLE PRECISION NOT NULL,
    "isValid" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndividualResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRAdjustment" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "originalAnswers" JSONB NOT NULL,
    "adjustedAnswers" JSONB NOT NULL,
    "adjustedWeights" JSONB NOT NULL,
    "adjustedCr" DOUBLE PRECISION NOT NULL,
    "useAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "changedQuestions" JSONB NOT NULL,
    "adjustedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CRAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupResult" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "validCount" INTEGER NOT NULL,
    "geoMeanMatrix" JSONB NOT NULL,
    "weights4" JSONB NOT NULL,
    "weights3" JSONB NOT NULL,
    "groupCr4" DOUBLE PRECISION NOT NULL,
    "groupCr3" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionLog" (
    "id" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "dataHash" TEXT NOT NULL,

    CONSTRAINT "SubmissionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyRound_token_key" ON "SurveyRound"("token");

-- CreateIndex
CREATE UNIQUE INDEX "IndividualResult_respondentId_key" ON "IndividualResult"("respondentId");

-- CreateIndex
CREATE UNIQUE INDEX "CRAdjustment_resultId_key" ON "CRAdjustment"("resultId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupResult_roundId_key" ON "GroupResult"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_respondentId_key" ON "Signature"("respondentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionLog_respondentId_key" ON "SubmissionLog"("respondentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "SurveyRound" ADD CONSTRAINT "SurveyRound_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respondent" ADD CONSTRAINT "Respondent_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "SurveyRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualResult" ADD CONSTRAINT "IndividualResult_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRAdjustment" ADD CONSTRAINT "CRAdjustment_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "IndividualResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupResult" ADD CONSTRAINT "GroupResult_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "SurveyRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionLog" ADD CONSTRAINT "SubmissionLog_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
