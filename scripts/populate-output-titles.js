import { PrismaClient } from '@prisma/client'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const prisma = new PrismaClient()
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function populateOutputTitles() {
  console.log('Starting to populate output titles...')
  
  // Get all outputs without titles
  const outputs = await prisma.output.findMany({
    where: { title: null },
    include: { spark: true }
  })
  
  console.log(`Found ${outputs.length} outputs to update`)
  
  for (const output of outputs) {
    try {
      console.log(`Processing output ${output.id}...`)
      
      // Generate title and cover prompt
      const { text: titleAndCover } = await generateText({
        model: openai('gpt-4o-mini'),
        system: `You are an expert at creating concise titles and visual prompts for creative ideas.`,
        messages: [{
          role: 'user',
          content: `For this creative idea, create:
1. A concise, catchy title (max 8 words)
2. A visual cover prompt for a diffusion model (max 20 words, descriptive of the visual style and mood)

Idea: ${output.text}

Format your response exactly as:
Title: [title here]
Cover: [visual prompt here]`
        }],
        temperature: 0.7,
      })

      // Parse the response
      const titleMatch = titleAndCover.match(/Title:\s*(.+?)(?:\n|$)/i)
      const coverMatch = titleAndCover.match(/Cover:\s*(.+?)(?:\n|$)/i)
      
      const title = titleMatch ? titleMatch[1].trim() : output.text.split('\n')[0].substring(0, 50)
      const coverPrompt = coverMatch ? coverMatch[1].trim() : null

      // Update the output
      await prisma.output.update({
        where: { id: output.id },
        data: { title, coverPrompt }
      })
      
      console.log(`✓ Updated output ${output.id} with title: "${title}"`)
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`✗ Failed to update output ${output.id}:`, error.message)
    }
  }
  
  console.log('Finished populating output titles')
}

populateOutputTitles()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
