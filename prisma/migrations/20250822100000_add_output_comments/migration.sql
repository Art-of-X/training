-- Create output_comments table to persist refinement timeline
CREATE TABLE IF NOT EXISTS "output_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "output_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT "output_comments_output_id_fkey" FOREIGN KEY ("output_id") REFERENCES "outputs"("id") ON DELETE CASCADE,
  CONSTRAINT "output_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "output_comments_output_id_idx" ON "output_comments"("output_id");

