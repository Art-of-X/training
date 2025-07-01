-- CreateTable
CREATE TABLE "demographics_questions" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT[],
    "category" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demographics_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demographics_answers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demographics_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demographics_answers_user_id_question_id_key" ON "demographics_answers"("user_id", "question_id");

-- AddForeignKey
ALTER TABLE "demographics_answers" ADD CONSTRAINT "demographics_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demographics_answers" ADD CONSTRAINT "demographics_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "demographics_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
