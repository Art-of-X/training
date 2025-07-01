#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const version = process.argv[2]

if (!version || !['commercial', 'research'].includes(version)) {
  console.log('Usage: node set-version.js [commercial|research]')
  console.log('')
  console.log('This script sets the VERSION environment variable for the application.')
  console.log('')
  console.log('commercial: Standard commercial styling with Px Grotesk font')
  console.log('research:   Research styling with Helvetica font and red primary color')
  process.exit(1)
}

// Read .env file or create from template
const envPath = path.join(__dirname, '..', '.env')
const envExamplePath = path.join(__dirname, '..', 'env.example')

let envContent = ''

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8')
} else if (fs.existsSync(envExamplePath)) {
  envContent = fs.readFileSync(envExamplePath, 'utf8')
  console.log('Creating .env file from env.example...')
} else {
  console.error('No .env or env.example file found!')
  process.exit(1)
}

// Update or add VERSION variable
const versionRegex = /^VERSION=.*$/m
if (versionRegex.test(envContent)) {
  envContent = envContent.replace(versionRegex, `VERSION=${version}`)
} else {
  envContent += `\nVERSION=${version}\n`
}

// Write the updated .env file
fs.writeFileSync(envPath, envContent)

console.log(`✅ Version set to: ${version}`)
console.log('')

if (version === 'research') {
  console.log('🔬 Research mode activated:')
  console.log('   - Font: Helvetica')
  console.log('   - Primary color: Red (rgb(245, 0, 0))')
  console.log('   - Colors: Black, white, and red only')
  console.log('   - Policy: HFBK Hamburg research information')
} else {
  console.log('💼 Commercial mode activated:')
  console.log('   - Font: Px Grotesk')
  console.log('   - Standard color scheme')
  console.log('   - Policy: Standard privacy policy')
}

console.log('')
console.log('Restart your development server to see the changes.') 