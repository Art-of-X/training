# 🚀 Setup Instructions - Artificial Artistic Thinking Platform

## Current Issue
You're getting the error: `P1010: User 'postgres' was denied access on the database 'placeholder.public'`

This is because your `.env` file still has placeholder values instead of real Supabase credentials.

## Step-by-Step Fix

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign in/create account
3. Click **"New Project"**
4. Fill in:
   - Project Name: `ai-creative-dna`
   - Database Password: Create strong password (SAVE THIS!)
   - Region: Choose closest to you
5. Click **"Create new project"** (takes ~2 minutes)

### 2. Get API Credentials
Go to **Settings > API** in your Supabase dashboard:

- Copy **Project URL** 
- Copy **anon public** key
- Copy **service_role** key (keep secret!)

### 3. Get Database Connection
Go to **Settings > Database**:
- Copy the **URI** connection string

### 4. Update Your .env File
Replace the placeholder values in your `.env` file:

```bash
# Replace these with your actual values:
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_REAL_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_REAL_SERVICE_KEY

DATABASE_URL="postgresql://postgres.YOUR_PROJECT_ID:[YOUR_PASSWORD]@aws-0-YOUR_REGION.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.YOUR_PROJECT_ID:[YOUR_PASSWORD]@aws-0-YOUR_REGION.pooler.supabase.com:5432/postgres"
```

### 5. Set Up Database Schema
After updating `.env`, run these commands:

```bash
# Push database schema to Supabase
npx prisma db push

# Optional: Open Prisma Studio to view data
npx prisma studio
```

### 6. Create Storage Buckets
In your Supabase dashboard, go to **Storage**:

1. Create bucket: `portfolio-assets` (public)
2. Create bucket: `monologue-recordings` (public) 
3. Create bucket: `peer-training-recordings` (public)

After creating the buckets, you must add security policies to allow users to upload files. Go to **Storage > Policies** and create a new policy for **each** of the three buckets above.

**Example for `portfolio-assets`:**
Click "New Policy" on the `portfolio-assets` bucket and "From scratch".

1.  **Allow `SELECT` (download) for everyone:**
    - Policy Name: `Allow public read access`
    - Allowed operations: `SELECT`
    - Target roles: `anon`, `authenticated`
    - Policy definition: `true` (or leave blank)

2.  **Allow `INSERT` (upload) for authenticated users into their own folder:**
    - Policy Name: `Allow individual insert`
    - Allowed operations: `INSERT`
    - Target roles: `authenticated`
    - Policy definition: `bucket_id = 'portfolio-assets' AND auth.uid()::text = (storage.foldername(name))[1]`

3.  **Allow `UPDATE` and `DELETE` for file owners:**
    - Policy Name: `Allow individual update and delete`
    - Allowed operations: `UPDATE`, `DELETE`
    - Target roles: `authenticated`
    - Policy definition: `bucket_id = 'portfolio-assets' AND auth.uid() = owner`

**Apply Similar Policies to Other Buckets**
Create similar policies for the `monologue-recordings` and `peer-training-recordings` buckets, replacing `portfolio-assets` in the policy definitions with the correct bucket name.

### 7. Set Up Row Level Security (RLS)

**NOTE:** If you previously ran `npx prisma db push` (Step 5) and are now seeing a `operator does not exist: text = uuid` error on this step, it's because of a schema mismatch. A fix has been applied to `prisma/schema.prisma`. Please run `npx prisma db push` again *before* running the SQL below to ensure your `user_profiles` table is correct.

In Supabase **SQL Editor**, run:

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE monologue_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_training_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_training_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones to make script re-runnable
-- This ensures the script can be run multiple times without errors.
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can access own profile" ON user_profiles; -- Old policy cleanup
DROP POLICY IF EXISTS "Users can access own portfolio" ON portfolio_shares;
DROP POLICY IF EXISTS "Users can access own recordings" ON monologue_recordings;

-- Allow users to create their own profile
CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can access own portfolio" ON portfolio_shares
  FOR ALL USING (user_id = auth.uid());
```