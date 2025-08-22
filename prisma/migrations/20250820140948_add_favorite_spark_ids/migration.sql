-- Add favorite_spark_ids column to user_profiles table
ALTER TABLE "user_profiles" 
ADD COLUMN "favorite_spark_ids" UUID[] DEFAULT '{}';
