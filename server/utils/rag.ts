import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export type RagChunk = {
  id: string
  content: string
  metadata: any
  similarity?: number
}

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL as string
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase URL or SERVICE ROLE key missing in env')
  }
  return createClient(supabaseUrl, serviceKey)
}

export async function getRagChunksForSparkByName(artistName: string, query: string, k: number = 5): Promise<RagChunk[]> {
  console.log(`[RAG] Fetching chunks for spark: "${artistName}" with query: "${query}"`)
  
  if (!artistName || !query) return []

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const supabase = createSupabaseServiceClient()

  const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query })
  const vector = emb.data[0]?.embedding
  if (!vector) return []

  const { data, error } = await supabase.rpc('match_spark_chunks', {
    query_embedding: vector,
    artist_name: artistName,
    match_count: k,
  })
  if (error) throw error
  
  if (data && data.length > 0) {
    console.log(`[RAG] Retrieved ${data.length} chunks for spark: "${artistName}"`)
  } else {
    console.log(`[RAG] No chunks found for spark: "${artistName}"`)
  }
  
  return (data || []) as RagChunk[]
}

export function formatRagContext(chunks: RagChunk[]): string {
  if (!chunks || chunks.length === 0) return ''
  const parts = chunks.map((c, i) => `[#${i + 1}] ${c.content}`)
  return parts.join('\n\n')
}


