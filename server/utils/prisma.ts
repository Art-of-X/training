import { PrismaClient } from '@prisma/client'

// Declare a global variable for PrismaClient
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// Initialize Prisma client with better error handling for newer Node versions
let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['warn', 'error'],
    errorFormat: 'pretty',
  })
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['warn', 'error'],
      errorFormat: 'pretty',
    })
  }
  prisma = global.__prisma
}

export { prisma } 