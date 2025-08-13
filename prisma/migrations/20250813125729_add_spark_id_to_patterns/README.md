# Migration: Add spark_id to patterns table

This migration adds support for artist artifacts in the patterns table by:

## Changes Made

1. **Added `spark_id` field**: New UUID field that references the `sparks` table
2. **Made `user_id` optional**: Since artist artifacts won't have a user, this field is now nullable
3. **Added foreign key constraint**: Links `spark_id` to the `sparks` table with CASCADE delete
4. **Added index**: Created `idx_patterns_spark_id` for efficient spark-based queries
5. **Added constraint**: Ensures either `user_id` OR `spark_id` is present (not both null)

## Schema Updates

The Prisma schema was updated to:
- Add `sparkId` field to the `Pattern` model
- Make `userId` optional
- Add relations to both `UserProfile` and `Spark` models
- Use named relations to avoid conflicts

## Database Changes

```sql
-- Add spark_id column
ALTER TABLE "patterns" ADD COLUMN "spark_id" UUID;

-- Make user_id nullable
ALTER TABLE "patterns" ALTER COLUMN "user_id" DROP NOT NULL;

-- Add index for performance
CREATE INDEX "idx_patterns_spark_id" ON "patterns"("spark_id");

-- Add foreign key constraint
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_spark_id_fkey" 
FOREIGN KEY ("spark_id") REFERENCES "sparks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add constraint to ensure data integrity
ALTER TABLE "patterns" ADD CONSTRAINT "check_user_or_spark" 
CHECK ("user_id" IS NOT NULL OR "spark_id" IS NOT NULL);
```

## Usage

This enables the system to:
- Store patterns from both users and AI sparks
- Query patterns by either user or spark
- Maintain referential integrity
- Support artist insights alongside user insights

## Next Steps

After applying this migration, you can:
1. Use the updated Prisma client
2. Create patterns linked to sparks (artist artifacts)
3. Query patterns by spark_id for AI-generated insights
4. Maintain backward compatibility with existing user-based patterns
