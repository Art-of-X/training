import { prisma } from './prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'
import crypto from 'crypto'



// Load mental models
let mentalModels: any = null
async function getMentalModels() {
  if (!mentalModels) {
    const mentalModelsPath = join(process.cwd(), 'assets', 'json', 'mental_models.json')
    const content = await readFile(mentalModelsPath, 'utf-8')
    mentalModels = JSON.parse(content)
  }
  return mentalModels
}

// Pattern classification using mental models
export async function classifyPatterns(userId: string, sparkId?: string) {
  console.log(`🔍 Classifying patterns for user ${userId}${sparkId ? ` (spark: ${sparkId})` : ''}`)
  
  if (!sparkId) {
    console.warn('No sparkId provided - patterns must be spark-specific')
    return { success: false, error: 'Spark ID required for pattern classification' }
  }
  
  try {
    const models = await getMentalModels()
    
    // Get the most recent chat message for this user (just sent)
    const recentMessages = await prisma.chatMessage.findMany({
      where: { 
        userId,
        role: 'user'
      },
      orderBy: { createdAt: 'desc' },
      take: 1 // Process only the most recent message
    })
    
    console.log(`Found ${recentMessages.length} new message to analyze`)
    
    let patternsCreated = 0
    
    for (const message of recentMessages) {
      const content = extractTextContent(message.content)
      console.log(`📝 Analyzing message content: "${content?.substring(0, 100)}..."`)
      
      if (!content || content.length < 10) {
        console.log(`⚠️ Skipping message - too short (${content?.length} chars)`)
        continue
      }
      
      // Simple pattern classification based on keywords and content
      const detectedPatterns = await analyzeContentForPatterns(content, models)
      
      for (const pattern of detectedPatterns) {
        // Check if pattern already exists for this message and spark
        const existingPattern = await prisma.pattern.findFirst({
          where: {
            sparkId,
            messageId: message.id,
            method: pattern.method,
            competency: pattern.competency
          }
        })
        
        if (!existingPattern) {
          console.log(`Creating pattern for spark ${sparkId}: ${pattern.method} / ${pattern.competency}`)
          await prisma.pattern.create({
            data: {
              sparkId, // Patterns are spark-specific
              messageId: message.id,
              method: pattern.method,
              competency: pattern.competency,
              spark: pattern.spark,
              isPredefined: pattern.isPredefined,
              isPredefinedMethod: pattern.isPredefinedMethod,
              isPredefinedCompetency: pattern.isPredefinedCompetency
            }
          })
          patternsCreated++
        } else {
          console.log(`Pattern already exists for message ${message.id}: ${pattern.method} / ${pattern.competency}`)
        }
      }
    }
    
    console.log(`✅ Created ${patternsCreated} new patterns for spark ${sparkId}`)
    return { success: true, patternsCreated }
    
  } catch (error) {
    console.error('❌ Pattern classification failed:', error)
    return { success: false, error: error.message }
  }
}

// Generate embeddings for user content
export async function generateEmbeddings(userId: string, sparkId?: string) {
  console.log(`🧠 Generating embeddings for user ${userId}${sparkId ? ` (spark: ${sparkId})` : ''}`)
  
  if (!sparkId) {
    console.warn('No sparkId provided - embeddings must be spark-specific')
    return { success: false, error: 'Spark ID required for embedding generation' }
  }
  
  try {
    // Get the specific spark
    const spark = await prisma.spark.findFirst({
      where: { id: sparkId, userId }
    })
    
    if (!spark) {
      return { success: false, error: 'Spark not found' }
    }
    
    let embeddingsCreated = 0
    
    // Only get chat messages from training sessions (my-spark page)
    // These are the messages where users are actively training their spark
    const messages = await prisma.chatMessage.findMany({
      where: { 
        userId,
        role: 'user'
        // Note: We should only process messages from my-spark training sessions
        // For now, we process recent user messages but this could be filtered further
      },
      orderBy: { createdAt: 'desc' },
      take: 3 // Reduced to only most recent training messages
    })
    
    // Only get portfolio items that are explicitly linked to this spark
    // These are items the user added through the "My Portfolio" section in my-spark.vue
    const portfolioItems = await prisma.portfolioItem.findMany({
      where: { 
        sparkId: spark.id, // ONLY items explicitly assigned to this spark
        userId // Ensure user owns the portfolio items
      },
      take: 50
    })
    
    // Process chat messages
    for (const message of messages) {
        const content = extractTextContent(message.content)
        if (!content || content.length < 10) continue
        
        const contentHash = crypto.createHash('sha256').update(content).digest('hex')
        
        // Check if embedding already exists
        const existing = await prisma.sparkEmbedding.findUnique({
          where: { contentHash }
        })
        
        if (!existing) {
          try {
            // Generate actual vector embedding
            const { OpenAI } = await import('openai')
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
            
            const embeddingResponse = await openai.embeddings.create({
              model: 'text-embedding-3-small',
              input: content,
            })
            
            const embedding = embeddingResponse.data[0]?.embedding
            if (!embedding) {
              console.warn(`Failed to generate embedding for message ${message.id}`)
              continue
            }
            
            // Create embedding record with actual vector using raw SQL
            await prisma.$executeRaw`
              INSERT INTO spark_embeddings (spark_id, content, content_hash, source_type, source_id, embedding, metadata, created_at, updated_at)
              VALUES (
                ${spark.id}::uuid,
                ${content},
                ${contentHash},
                'chat',
                ${message.id},
                ${`[${embedding.join(',')}]`}::vector,
                ${JSON.stringify({ 
                  messageRole: message.role,
                  createdAt: message.createdAt.toISOString()
                })}::jsonb,
                NOW(),
                NOW()
              );
            `
            embeddingsCreated++
            
            console.log(`✅ Created embedding for chat message: "${content.substring(0, 50)}..."`)
          } catch (embeddingError) {
            console.error(`Failed to create embedding for message ${message.id}:`, embeddingError)
          }
        }
    }
    
    // Process portfolio items
    for (const item of portfolioItems) {
        if (!item.description || item.description.length < 5) continue
        
        const content = item.link ? `${item.description} - ${item.link}` : item.description
        const contentHash = crypto.createHash('sha256').update(content).digest('hex')
        
        const existing = await prisma.sparkEmbedding.findUnique({
          where: { contentHash }
        })
        
        if (!existing) {
          try {
            // Generate actual vector embedding
            const { OpenAI } = await import('openai')
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
            
            const embeddingResponse = await openai.embeddings.create({
              model: 'text-embedding-3-small',
              input: content,
            })
            
            const embedding = embeddingResponse.data[0]?.embedding
            if (!embedding) {
              console.warn(`Failed to generate embedding for portfolio item ${item.id}`)
              continue
            }
            
            // Create embedding record with actual vector using raw SQL
            await prisma.$executeRaw`
              INSERT INTO spark_embeddings (spark_id, content, content_hash, source_type, source_id, embedding, metadata, created_at, updated_at)
              VALUES (
                ${spark.id}::uuid,
                ${content},
                ${contentHash},
                'portfolio',
                ${item.id},
                ${`[${embedding.join(',')}]`}::vector,
                ${JSON.stringify({ 
                  description: item.description,
                  link: item.link,
                  filePath: item.filePath,
                  createdAt: item.createdAt.toISOString()
                })}::jsonb,
                NOW(),
                NOW()
              );
            `
            embeddingsCreated++
            
            console.log(`✅ Created embedding for portfolio item: "${content.substring(0, 50)}..."`)
          } catch (embeddingError) {
            console.error(`Failed to create embedding for portfolio item ${item.id}:`, embeddingError)
          }
        }
    }
    
    console.log(`✅ Created ${embeddingsCreated} new embeddings for spark ${sparkId}`)
    return { success: true, embeddingsCreated }
    
  } catch (error) {
    console.error('❌ Embedding generation failed:', error)
    return { success: false, error: error.message }
  }
}

// Generate dendrograms for user sparks
export async function generateDendrograms(userId: string, sparkId?: string) {
  console.log(`🎨 Generating dendrograms for user ${userId}${sparkId ? ` (spark: ${sparkId})` : ''}`)
  
  try {
    let sparksToProcess = []
    
    if (sparkId) {
      // Generate for specific spark
      const spark = await prisma.spark.findFirst({
        where: { id: sparkId, userId },
        include: {
          patterns: {
            where: {
              AND: [
                { method: { not: '' } },
                { competency: { not: '' } },
                { spark: { not: '' } }
              ]
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      })
      if (spark) sparksToProcess = [spark]
    } else {
      // Generate for all user sparks
      sparksToProcess = await prisma.spark.findMany({
        where: { userId },
        include: {
          patterns: {
            where: {
              AND: [
                { method: { not: '' } },
                { competency: { not: '' } },
                { spark: { not: '' } }
              ]
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    }
    
    let dendrogramsCreated = 0
    
    for (const spark of sparksToProcess) {
      if (spark.patterns.length === 0) continue
      
      // Generate dendrogram SVG
      const svg = await generateDendrogramSVG(spark.name, spark.patterns)
      
      // Save to database
      await prisma.sparkDendrogram.upsert({
        where: { sparkId: spark.id },
        create: {
          sparkId: spark.id,
          dendrogramSvg: svg
        },
        update: {
          dendrogramSvg: svg,
          updatedAt: new Date()
        }
      })
      
      dendrogramsCreated++
    }
    
    console.log(`✅ Created ${dendrogramsCreated} dendrograms`)
    return { success: true, dendrogramsCreated }
    
  } catch (error) {
    console.error('❌ Dendrogram generation failed:', error)
    return { success: false, error: error.message }
  }
}

// Ingest content from uploads
export async function ingestContent(userId: string, sparkId?: string) {
  console.log(`📥 Ingesting content for user ${userId}${sparkId ? ` (spark: ${sparkId})` : ''}`)
  
  try {
    const whereClause = sparkId 
      ? { userId, sparkId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      : { userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    
    // Get recent portfolio items that might need processing
    const recentItems = await prisma.portfolioItem.findMany({
      where: whereClause
    })
    
    console.log(`Found ${recentItems.length} recent portfolio items`)
    
    // TODO: Implement file processing for PDFs, images, etc.
    // For now, just log that ingestion would happen here
    
    return { success: true, itemsProcessed: recentItems.length }
    
  } catch (error) {
    console.error('❌ Content ingestion failed:', error)
    return { success: false, error: error.message }
  }
}

// Helper functions
function extractTextContent(content: any): string {
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        return parsed
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join(' ')
      }
      // Handle single object with text field
      if (parsed && parsed.type === 'text' && parsed.text) {
        return parsed.text
      }
      return String(parsed)
    } catch {
      return content
    }
  }
  
  if (Array.isArray(content)) {
    return content
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join(' ')
  }
  
  // Handle single object with text field
  if (content && content.type === 'text' && content.text) {
    return content.text
  }
  
  return String(content)
}

async function analyzeContentForPatterns(content: string, models: any) {
  const patterns = []
  const competencies = models.competencies || []
  const methods = models.methods || []
  
  console.log(`Analyzing content: "${content.substring(0, 100)}..."`)
  
  // Enhanced pattern detection - always create at least one pattern
  let foundCompetency = null
  let foundMethod = null
  
  // Check for competency keywords (more flexible matching)
  const contentLower = content.toLowerCase()
  
  for (const competency of competencies.slice(0, 10)) { // Check first 10 competencies
    const competencyName = competency.name.toLowerCase()
    const description = competency.description.toLowerCase()
    
    // Check for direct name match or key terms from description
    if (contentLower.includes(competencyName) || 
        description.includes('art') && contentLower.includes('art') ||
        description.includes('create') && contentLower.includes('creat') ||
        description.includes('express') && contentLower.includes('express') ||
        description.includes('innovation') && contentLower.includes('innovat')) {
      foundCompetency = competency
      break
    }
  }
  
  // Check for method keywords
  for (const method of methods.slice(0, 8)) { // Check first 8 methods
    const methodName = method.name.toLowerCase()
    const description = method.description.toLowerCase()
    
    if (contentLower.includes(methodName) ||
        description.includes('intuition') && (contentLower.includes('feel') || contentLower.includes('sense')) ||
        description.includes('innovation') && contentLower.includes('new') ||
        description.includes('process') && contentLower.includes('process')) {
      foundMethod = method
      break
    }
  }
  
  // Extract the most relevant spark quote from the user message
  // The spark should be a verbatim quote from the actual user message, not the competency
  const sparkQuote = extractSparkQuote(content, foundCompetency, foundMethod)
  
  // Create pattern based on what we found
  if (foundCompetency || foundMethod) {
    const competency = foundCompetency || competencies[Math.floor(Math.random() * Math.min(competencies.length, 5))]
    const method = foundMethod || methods[Math.floor(Math.random() * Math.min(methods.length, 3))]
    
    patterns.push({
      method: method?.name || 'Intuition',
      competency: competency?.name || 'Creative Expression',
      spark: sparkQuote, // Use actual message content, not competency name
      isPredefined: !!competency,
      isPredefinedMethod: !!method,
      isPredefinedCompetency: !!competency
    })
    
    console.log(`Detected pattern: ${method?.name || 'Intuition'} / ${competency?.name || 'Creative Expression'} - Spark: "${sparkQuote.substring(0, 50)}..."`)
  } else {
    // Always create a pattern - cycle through different defaults
    const defaultCompetencies = ['Creative Expression', 'Artistic Intuition', 'Process Openness', 'Innovation', 'Aesthetic Experience']
    const defaultMethods = ['Intuition', 'Innovation', 'Process Openness', 'Aesthetic Experience', 'Conceptual Stringency']
    
    const randomCompetency = defaultCompetencies[Math.floor(Math.random() * defaultCompetencies.length)]
    const randomMethod = defaultMethods[Math.floor(Math.random() * defaultMethods.length)]
    
    patterns.push({
      method: randomMethod,
      competency: randomCompetency,
      spark: sparkQuote, // Use actual message content, not competency name
      isPredefined: false,
      isPredefinedMethod: false,
      isPredefinedCompetency: false
    })
    
    console.log(`Created default pattern: ${randomMethod} / ${randomCompetency} - Spark: "${sparkQuote.substring(0, 50)}..."`)
  }
  
  return patterns
}

// Helper function to extract the most relevant spark quote from user message
function extractSparkQuote(content: string, foundCompetency: any, foundMethod: any): string {
  // If content is short enough, use the entire message
  if (content.length <= 200) {
    return content.trim()
  }
  
  // Try to find the most relevant sentence or phrase
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
  
  // If we found specific competency or method matches, try to find the sentence containing them
  if (foundCompetency || foundMethod) {
    const searchTerms = []
    if (foundCompetency) {
      searchTerms.push(foundCompetency.name.toLowerCase())
      // Extract key terms from competency description
      const description = foundCompetency.description?.toLowerCase() || ''
      if (description.includes('art')) searchTerms.push('art')
      if (description.includes('create')) searchTerms.push('creat')
      if (description.includes('express')) searchTerms.push('express')
    }
    if (foundMethod) {
      searchTerms.push(foundMethod.name.toLowerCase())
      const description = foundMethod.description?.toLowerCase() || ''
      if (description.includes('intuition')) searchTerms.push('feel', 'sense', 'intuition')
      if (description.includes('innovation')) searchTerms.push('new', 'innovation')
    }
    
    // Find sentence containing the most relevant terms
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase()
      for (const term of searchTerms) {
        if (sentenceLower.includes(term)) {
          return sentence.trim()
        }
      }
    }
  }
  
  // If no specific match found, use the longest sentence (likely most descriptive)
  if (sentences.length > 0) {
    const longestSentence = sentences.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    )
    return longestSentence.trim()
  }
  
  // Fallback: use first 200 characters of the content
  return content.substring(0, 200).trim() + (content.length > 200 ? '...' : '')
}

async function generateDendrogramSVG(sparkName: string, patterns: any[]): Promise<string> {
  // Build hierarchy from patterns
  const methodGroups: Record<string, any[]> = {}
  const competencyGroups: Record<string, any[]> = {}
  
  for (const pattern of patterns) {
    if (pattern.method) {
      if (!methodGroups[pattern.method]) methodGroups[pattern.method] = []
      methodGroups[pattern.method].push(pattern)
    }
    if (pattern.competency) {
      if (!competencyGroups[pattern.competency]) competencyGroups[pattern.competency] = []
      competencyGroups[pattern.competency].push(pattern)
    }
  }
  
  // Get top methods and competencies
  const topMethods = Object.entries(methodGroups)
    .sort(([,a], [,b]) => b.length - a.length)
    .slice(0, 5)
  
  const topCompetencies = Object.entries(competencyGroups)
    .sort(([,a], [,b]) => b.length - a.length)
    .slice(0, 3)
  
  // Generate SVG
  const width = 500
  const height = 500
  const cx = width / 2
  const cy = height / 2
  const maxRadius = Math.min(width, height) / 2 - 20
  
  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        .link { stroke: #000000; stroke-width: 3; fill: none; }
        .spark-node { fill: #000000; }
        .method-node { fill: #000000; }
        .competency-node { fill: #000000; }
      </style>
    </defs>
    <g class="links">`
  
  // Calculate positions
  const nodes: Array<{x: number, y: number, type: string, size: number}> = []
  
  // Root node (center)
  nodes.push({ x: cx, y: cy, type: 'spark', size: 12 })
  
  // Method nodes (inner circle)
  topMethods.forEach(([method], index) => {
    const angle = (2 * Math.PI * index) / topMethods.length
    const radius = maxRadius * 0.6
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    nodes.push({ x, y, type: 'method', size: 8 })
    
    // Add link from center to method
    svg += `<line class="link" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" />`
  })
  
  // Competency nodes (outer circle)
  topCompetencies.forEach(([competency], index) => {
    const angle = (2 * Math.PI * index) / topCompetencies.length + Math.PI / topCompetencies.length
    const radius = maxRadius * 0.9
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    nodes.push({ x, y, type: 'competency', size: 6 })
    
    // Add link from center to competency
    svg += `<line class="link" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" />`
  })
  
  svg += `</g><g class="nodes">`
  
  // Add nodes
  nodes.forEach(node => {
    const className = `${node.type}-node`
    svg += `<rect class="node ${className}" x="${node.x - node.size/2}" y="${node.y - node.size/2}" width="${node.size}" height="${node.size}" rx="0" />`
  })
  
  svg += `</g></svg>`
  
  return svg
}

// Main pipeline processor
export async function runPipelineSteps(jobId: string, steps: string[], userId: string, sparkId?: string) {
  console.log(`🚀 Running pipeline steps [${steps.join(', ')}] for user ${userId}${sparkId ? ` (spark: ${sparkId})` : ''}`)
  
  const results: Record<string, any> = {}
  
  try {
    for (const step of steps) {
      console.log(`⚡ Processing step: ${step}`)
      
      switch (step) {
        case 'ingest':
          results.ingest = await ingestContent(userId, sparkId)
          break
          
        case 'patterns':
          results.patterns = await classifyPatterns(userId, sparkId)
          break
          
        case 'embeddings':
          results.embeddings = await generateEmbeddings(userId, sparkId)
          break
          
        case 'dendrograms':
          results.dendrograms = await generateDendrograms(userId, sparkId)
          break
          
        case 'cleanup':
          results.cleanup = await cleanupUserData(userId, sparkId)
          break
          
        case 'meta_sparks':
          results.meta_sparks = await generateMetaSparks(userId, sparkId)
          break
          
        default:
          console.warn(`Unknown step: ${step}`)
      }
    }
    
    // Job completion would be tracked here if needed
    console.log(`✅ Pipeline job ${jobId} completed successfully`)
    
    console.log(`✅ Pipeline completed successfully for user ${userId}`)
    return { success: true, results }
    
  } catch (error) {
    console.error(`❌ Pipeline failed for user ${userId}:`, error)
    
    // Job failure would be tracked here if needed
    console.log(`❌ Pipeline job ${jobId} failed`)
    
    return { success: false, error: error.message }
  }
}

// Additional pipeline functions
async function cleanupUserData(userId: string, sparkId?: string) {
  console.log(`🧹 Cleaning up data for user ${userId}${sparkId ? ` (spark: ${sparkId})` : ''}`)
  
  try {
    const whereClause = sparkId ? `spark_id = '${sparkId}'::uuid` : `user_id = '${userId}'::uuid`
    
    // Remove duplicate patterns
    const duplicates = await prisma.$queryRaw`
      SELECT id FROM patterns 
      WHERE ${whereClause}
      AND id NOT IN (
        SELECT MIN(id) FROM patterns 
        WHERE ${whereClause}
        GROUP BY message_id, method, competency
      )
    `
    
    if (Array.isArray(duplicates) && duplicates.length > 0) {
      const duplicateIds = duplicates.map((d: any) => d.id)
      await prisma.pattern.deleteMany({
        where: { id: { in: duplicateIds } }
      })
      console.log(`Removed ${duplicates.length} duplicate patterns`)
    }
    
    return { success: true, duplicatesRemoved: duplicates.length }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function generateMetaSparks(userId: string, sparkId?: string) {
  console.log(`🔮 Generating meta-spark analysis for user ${userId}${sparkId ? ` (spark: ${sparkId})` : ''}`)
  
  try {
    // TODO: Implement meta-spark generation
    // This would analyze patterns across user's spark(s) and generate insights
    
    return { success: true, message: 'Meta-spark analysis placeholder' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
