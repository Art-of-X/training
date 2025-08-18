-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "memory" TEXT,
    "voice_id" TEXT,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT,
    "file_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monologue_recordings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "audio_path" TEXT,
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "question_id" INTEGER,
    "supplementary_file_path" TEXT,
    "supplementary_description" TEXT,
    "supplementary_link" TEXT,
    "text_response" TEXT,
    "is_custom_question" BOOLEAN NOT NULL DEFAULT false,

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

-- CreateTable
CREATE TABLE "demographics_answers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "question_key" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demographics_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled Chat',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "content" JSONB NOT NULL,
    "metadata" JSONB,
    "type" TEXT NOT NULL DEFAULT 'text',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_agent_recordings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "audioPath" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_agent_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patterns" (
    "id" SERIAL NOT NULL,
    "user_id" UUID,
    "message_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "spark" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_predefined" BOOLEAN NOT NULL DEFAULT true,
    "spark_id" UUID,
    "is_predefined_method" BOOLEAN NOT NULL DEFAULT false,
    "is_predefined_competency" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sparks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sparks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_items" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "description" TEXT,
    "link" TEXT,
    "file_path" TEXT,
    "text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sparks_on_projects" (
    "project_id" UUID NOT NULL,
    "spark_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sparks_on_projects_pkey" PRIMARY KEY ("project_id","spark_id")
);

-- CreateTable
CREATE TABLE "outputs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "spark_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "run_id" UUID,

    CONSTRAINT "outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spark_dendrograms" (
    "id" UUID NOT NULL,
    "spark_id" UUID NOT NULL,
    "dendrogram_svg" TEXT NOT NULL,
    "dendrogram_png" BYTEA,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spark_dendrograms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_runs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "summary" TEXT,

    CONSTRAINT "project_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_run_events" (
    "id" SERIAL NOT NULL,
    "run_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_run_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vector_chunks" (
    "id" UUID NOT NULL,
    "artist_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(1536) NOT NULL,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vector_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_queries" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "artist_name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "demographics_answers_user_id_question_key_key" ON "demographics_answers"("user_id", "question_key");

-- CreateIndex
CREATE INDEX "chat_messages_user_id_createdAt_idx" ON "chat_messages"("user_id", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "idx_patterns_predefined_competency" ON "patterns"("is_predefined_competency");

-- CreateIndex
CREATE INDEX "idx_patterns_predefined_method" ON "patterns"("is_predefined_method");

-- CreateIndex
CREATE UNIQUE INDEX "spark_dendrograms_spark_id_key" ON "spark_dendrograms"("spark_id");

-- CreateIndex
CREATE INDEX "project_run_events_run_id_id_idx" ON "project_run_events"("run_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "vector_chunks_content_hash_key" ON "vector_chunks"("content_hash");

-- CreateIndex
CREATE INDEX "vector_chunks_artist_name_idx" ON "vector_chunks"("artist_name");

-- CreateIndex
CREATE INDEX "vector_chunks_content_hash_idx" ON "vector_chunks"("content_hash");

-- CreateIndex
CREATE INDEX "rag_queries_artist_name_idx" ON "rag_queries"("artist_name");

-- CreateIndex
CREATE INDEX "rag_queries_user_id_idx" ON "rag_queries"("user_id");

-- CreateIndex
CREATE INDEX "rag_queries_created_at_idx" ON "rag_queries"("created_at");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monologue_recordings" ADD CONSTRAINT "monologue_recordings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_training_participants" ADD CONSTRAINT "peer_training_participants_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "peer_training_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_training_participants" ADD CONSTRAINT "peer_training_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aut_answers" ADD CONSTRAINT "aut_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rat_answers" ADD CONSTRAINT "rat_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dat_submissions" ADD CONSTRAINT "dat_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demographics_answers" ADD CONSTRAINT "demographics_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_agent_recordings" ADD CONSTRAINT "voice_agent_recordings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_spark_id_fkey" FOREIGN KEY ("spark_id") REFERENCES "sparks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparks" ADD CONSTRAINT "sparks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_items" ADD CONSTRAINT "context_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparks_on_projects" ADD CONSTRAINT "sparks_on_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparks_on_projects" ADD CONSTRAINT "sparks_on_projects_spark_id_fkey" FOREIGN KEY ("spark_id") REFERENCES "sparks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_spark_id_fkey" FOREIGN KEY ("spark_id") REFERENCES "sparks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "project_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spark_dendrograms" ADD CONSTRAINT "spark_dendrograms_spark_id_fkey" FOREIGN KEY ("spark_id") REFERENCES "sparks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_runs" ADD CONSTRAINT "project_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_runs" ADD CONSTRAINT "project_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_run_events" ADD CONSTRAINT "project_run_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "project_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

