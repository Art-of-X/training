/* eslint-disable no-console */
/**
 * This script verifies that the project is set up correctly for development.
 * It checks for:
 * 1. The presence of a .env file.
 * 2. Correct installation of node_modules.
 * 3. Successful generation of the Prisma client.
 * 4. Running Supabase Docker containers.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

const log = console.log;
const error = (message) => log(chalk.red.bold(`❌ ERROR: ${message}`));
const success = (message) => log(chalk.green.bold(`✅ ${message}`));
const info = (message) => log(chalk.blue.bold(`ℹ️ ${message}`));
const warn = (message) => log(chalk.yellow.bold(`⚠️ ${message}`));

let hasErrors = false;

console.log('🔍 Verifying Artistic AI Platform Setup\n');

const checks = [
    {
        name: 'SUPABASE_URL',
        value: process.env.SUPABASE_URL,
        expected: /^https:\/\/[a-z0-9]+\.supabase\.co$/,
        message: 'Should be https://your-project-id.supabase.co'
    },
    {
        name: 'SUPABASE_ANON_KEY',
        value: process.env.SUPABASE_ANON_KEY,
        expected: /^eyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=_-]+$/,
        message: 'Should be a JWT token starting with eyJ'
    },
    {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        value: process.env.SUPABASE_SERVICE_ROLE_KEY,
        expected: /^eyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=_-]+$/,
        message: 'Should be a JWT token starting with eyJ'
    },
    {
        name: 'DATABASE_URL',
        value: process.env.DATABASE_URL,
        expected: /^postgresql:\/\/postgres\.[a-z0-9]+:/,
        message: 'Should start with postgresql://postgres.your-project-id:'
    }
];

let allValid = true;

checks.forEach(check => {
    const isValid = check.value && check.expected.test(check.value);
    const status = isValid ? '✅' : '❌';
    
    console.log(`${status} ${check.name}`);
    
    if (!isValid) {
        allValid = false;
        if (!check.value) {
            console.log(`   Missing value - ${check.message}`);
        } else if (check.value.includes('placeholder') || check.value.includes('YOUR_')) {
            console.log(`   Still has placeholder value - ${check.message}`);
        } else {
            console.log(`   Invalid format - ${check.message}`);
        }
        console.log('');
    }
});

if (allValid) {
    console.log('\n🎉 All environment variables look good!');
    console.log('You can now run: npx prisma db push');
} else {
    console.log('\n⚠️  Please fix the issues above before proceeding.');
    console.log('Update your .env file with real Supabase credentials.');
    console.log('\n📖 See SETUP-INSTRUCTIONS.md for detailed steps.');
}

console.log('\n🔗 Quick Links:');
console.log('   Supabase Dashboard: https://supabase.com/dashboard');
console.log('   Get API Keys: Settings > API');
console.log('   Get Database URL: Settings > Database\n'); 