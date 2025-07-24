-- CreateTable
CREATE TABLE "voice_agent_recordings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "audioPath" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_agent_recordings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "voice_agent_recordings" ADD CONSTRAINT "voice_agent_recordings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
