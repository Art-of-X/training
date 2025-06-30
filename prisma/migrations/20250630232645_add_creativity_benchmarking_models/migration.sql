-- CreateTable
CREATE TABLE "aut_questions" (
    "id" SERIAL NOT NULL,
    "object" TEXT NOT NULL,

    CONSTRAINT "aut_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aut_answers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" INTEGER NOT NULL,
    "uses" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aut_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rat_questions" (
    "id" SERIAL NOT NULL,
    "word1" TEXT NOT NULL,
    "word2" TEXT NOT NULL,
    "word3" TEXT NOT NULL,

    CONSTRAINT "rat_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rat_answers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rat_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dat_submissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "words" TEXT[],
    "score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dat_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aut_questions_object_key" ON "aut_questions"("object");

-- CreateIndex
CREATE UNIQUE INDEX "rat_questions_word1_word2_word3_key" ON "rat_questions"("word1", "word2", "word3");

-- AddForeignKey
ALTER TABLE "aut_answers" ADD CONSTRAINT "aut_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aut_answers" ADD CONSTRAINT "aut_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "aut_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rat_answers" ADD CONSTRAINT "rat_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rat_answers" ADD CONSTRAINT "rat_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "rat_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dat_submissions" ADD CONSTRAINT "dat_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
