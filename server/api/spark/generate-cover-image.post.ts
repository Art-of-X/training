import { serverSupabaseUser } from '#supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { experimental_generateImage as generateImage } from 'ai'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  coverPrompt: z.string().min(1, 'Cover prompt is required'),
  outputId: z.string().uuid('Valid output ID is required'),
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  const { coverPrompt, outputId } = parsed.data

  try {
    // Verify the output belongs to the user
    const output = await prisma.output.findFirst({
      where: { 
        id: outputId,
        project: { userId: user.id }
      },
      include: { project: true }
    })

    if (!output) {
      throw createError({ statusCode: 404, message: 'Output not found' })
    }

    // Generate image using OpenAI via ai package
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const response = await generateImage({
      model: openai('dall-e-3'),
      prompt: coverPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard', // Use standard quality for cost-effectiveness
    })

    const imageUrl = response.images[0]?.url
    if (!imageUrl) {
      throw createError({ statusCode: 500, message: 'Failed to generate image' })
    }

    // Update the output with the generated image URL
    await prisma.output.update({
      where: { id: outputId },
      data: { coverImageUrl: imageUrl }
    })

    return { 
      success: true, 
      imageUrl,
      message: 'Cover image generated successfully' 
    }

  } catch (error: any) {
    console.error('Error generating cover image:', error)
    throw createError({ 
      statusCode: 500, 
      message: error.message || 'Failed to generate cover image' 
    })
  }
})
