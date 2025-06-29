#!/usr/bin/env node

/**
 * Setup script for Artificial Artistic Thinking Training Platform
 * This script helps you configure your environment variables
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Artificial Artistic Thinking Training Platform - Environment Setup\n');

const envTemplate = `# ===========================================
# SUPABASE CONFIGURATION (REQUIRED)
# ===========================================
# Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

# Project URL (from "Project URL" section)
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

# Public anon key (from "Project API keys" section - "anon public")
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (from "Project API keys" section - "service_role" - KEEP SECRET!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===========================================
# DATABASE CONFIGURATION (REQUIRED)
# ===========================================
# Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database

# Connection string (from "Connection string" section - "URI")
DATABASE_URL="postgresql://postgres.YOUR_PROJECT_ID:[YOUR_PASSWORD]@aws-0-YOUR_REGION.pooler.supabase.com:5432/postgres?pgbouncer=true"

# Direct connection (same as above but without pgbouncer=true)
DIRECT_URL="postgresql://postgres.YOUR_PROJECT_ID:[YOUR_PASSWORD]@aws-0-YOUR_REGION.pooler.supabase.com:5432/postgres"

# Application Configuration
NODE_ENV=development

# ===========================================
# OPTIONAL CONFIGURATIONS
# ===========================================
# Uncomment and configure when needed

# WebRTC Service Configuration (for future Peer Training)
# DAILY_API_KEY=your_daily_api_key
# AGORA_APP_ID=your_agora_app_id

# OpenAI Configuration (for future AI integrations)
# OPENAI_API_KEY=your_openai_api_key
`;

const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists!');
    console.log('   Please edit it manually or delete it first.\n');
} else {
    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ Created .env file with template');
    console.log('   Please edit .env and replace the placeholder values with your actual Supabase credentials.\n');
}

console.log('📋 Next Steps:');
console.log('1. Create a Supabase project at https://supabase.com');
console.log('2. Get your credentials from Settings > API');
console.log('3. Get your database connection from Settings > Database');
console.log('4. Edit the .env file with your real values');
console.log('5. Run: npx prisma db push');
console.log('6. Run: npm run dev\n');

console.log('🔗 Helpful Links:');
console.log('   Supabase Dashboard: https://supabase.com/dashboard');
console.log('   Documentation: https://supabase.com/docs\n'); 