-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_shares" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "links" TEXT[],
    "pdf_paths" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monologue_questions" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monologue_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monologue_recordings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "audio_path" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "question_id" INTEGER NOT NULL,

    CONSTRAINT "monologue_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peer_training_recordings" (
    "id" UUID NOT NULL,
    "video_path" TEXT NOT NULL,
    "specific_questions" TEXT[],
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peer_training_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peer_training_participants" (
    "training_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "peer_training_participants_pkey" PRIMARY KEY ("training_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_username_key" ON "user_profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_shares_user_id_key" ON "portfolio_shares"("user_id");

-- AddForeignKey
ALTER TABLE "portfolio_shares" ADD CONSTRAINT "portfolio_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monologue_recordings" ADD CONSTRAINT "monologue_recordings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monologue_recordings" ADD CONSTRAINT "monologue_recordings_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "monologue_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_training_participants" ADD CONSTRAINT "peer_training_participants_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "peer_training_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_training_participants" ADD CONSTRAINT "peer_training_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
