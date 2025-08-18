import { defineEventHandler, readBody } from 'h3'

// In production, store these securely (e.g., in env or DB)
const VALID_CODES = [
  'ARTX2024',
  'HFBKAI',
  'TRAININGACCESS',
  'ARTOFAUGUST'
]

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const accessCode = body?.accessCode
  const valid = typeof accessCode === 'string' && VALID_CODES.includes(accessCode.trim())
  return { valid }
}) 