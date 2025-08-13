import { defineEventHandler } from 'h3'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    console.log('Testing spark API...')
    
    // Test basic Prisma connection
    const sparkCount = await prisma.spark.count()
    console.log(`Found ${sparkCount} sparks`)
    
    // Test the actual query
    const sparks = await prisma.spark.findMany({
      take: 3,
      orderBy: {
        updatedAt: 'desc',
      },
    })
    
    console.log(`Retrieved ${sparks.length} sparks`)
    
    return { 
      success: true, 
      count: sparkCount, 
      sample: sparks.map(s => ({ id: s.id, name: s.name }))
    }
  } catch (error: any) {
    console.error('Test API error:', error)
    return { 
      success: false, 
      error: error.message,
      stack: error.stack
    }
  }
})
