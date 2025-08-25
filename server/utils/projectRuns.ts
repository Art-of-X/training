import { prisma } from '~/server/utils/prisma'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createAnalyzeLinkTool, createDocumentProcessingTool } from '~/server/utils/ai-tools'
import { buildSparkMentalModelsSection } from '~/server/utils/sparkMentalModels'
import { getRagChunksForSparkByName, formatRagContext } from '~/server/utils/rag'

type RunEvent = { type: string; payload?: any }

async function emit(runId: string, event: RunEvent) {
  try {
    await prisma.projectRunEvent.create({ data: { runId, type: event.type, payload: event.payload || {} } })
  } catch (e) {
    // best-effort
  }
}

export async function processProjectRun(runId: string) {
  // Use any-cast to avoid linter mismatches when Prisma Client types lag local schema
  const db = prisma as any
  const run = await prisma.projectRun.findUnique({
    where: { id: runId },
    include: {
      project: { include: { contextItems: true, sparks: { include: { spark: true } } } },
      user: true,
    },
  })
  if (!run) return
  const project = run.project
  const user = run.user

  // Check if run was cancelled before starting
  if (run.status === 'cancelled') {
    console.log(`Run ${runId} was cancelled, stopping processing`)
    return
  }

  if (!project.task || project.sparks.length === 0) {
    await prisma.projectRun.update({ where: { id: runId }, data: { status: 'error', finishedAt: new Date(), summary: 'No task or no sparks' } })
    return
  }

  await emit(runId, { type: 'run:started', payload: { projectId: project.id, task: project.task } })

  const assignedSparks = project.sparks.map(s => s.spark)
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const tools = {
    analyzeLink: createAnalyzeLinkTool(user.id),
    documentProcessing: createDocumentProcessingTool(user.id),
  } as const

  const structuredContext = project.contextItems.map((item) => ({
    id: item.id,
    description: item.description || '',
    link: item.link || undefined,
    filePath: item.filePath || undefined,
    text: item.text || undefined,
  }))

  // Phase 1: Individual ideation - each spark creates 2-3 proposals
  await emit(runId, { type: 'phase:ideation', payload: { message: 'Agents are creating individual proposals...' } })
  
  const ideations: { sparkId: string; sparkName: string; proposals: string[] }[] = []

  for (const spark of assignedSparks) {
    // Check for cancellation before processing each spark
    const currentRun = await prisma.projectRun.findUnique({ where: { id: runId }, select: { status: true } })
    if (currentRun?.status === 'cancelled') {
      console.log(`Run ${runId} was cancelled during spark processing, stopping`)
      return
    }

    await emit(runId, { type: 'agent:started', payload: { sparkId: spark.id, name: spark.name } })
    
    try {
      const mentalModels = await buildSparkMentalModelsSection(spark.id)
      const personaDirective = `\n\n---\n\nCore Directive:\n- You are ${spark.name}. Always think and respond through your unique artistic persona.\n- No matter how far the task is from your domain—even if it seems banal—you MUST solve it using your artistic way of thinking.\n- Consciously apply the thinking methods and thinking competencies provided (your patterns) to guide your internal reasoning and the final result.\n- There are no boundaries: reinterpret any problem through your creative lens while remaining specific, useful, and actionable.\n- Use tool outputs and RAG context when helpful, but keep your persona, voice, and patterns at the center of your solution.`
      const system = mentalModels ? `${spark.systemPrompt}\n\n---\n\n${mentalModels}${personaDirective}` : `${spark.systemPrompt}${personaDirective}`
      
      // Build Spark-specific RAG context using the project task as query
      let ragContext = ''
      try {
        const ragChunks = await getRagChunksForSparkByName(spark.name, project.task, 5)
        ragContext = formatRagContext(ragChunks)
      } catch {}

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system,
        messages: [{
          role: 'user',
          content: [
            ragContext ? { type: 'text', text: `Use the following context from ${spark.name}'s knowledge base if relevant.\n\n[Context]\n${ragContext}` } : { type: 'text', text: '' },
            { type: 'text', text: `You are collaborating with other domain experts to solve a project task. Create 2-3 distinct, innovative solution ideas.` },
            { type: 'text', text: `Task: ${project.task}` },
            { type: 'text', text: `Context items (links, files, or text) are provided below. Use the available tools when helpful to analyze them: 1) analyzeLink(url) for web links, 2) documentProcessing(fileUrl, context) for files. If text is present, read it directly.` },
            { type: 'text', text: `Context JSON: ${JSON.stringify(structuredContext).substring(0, 7500)}` },
            { type: 'text', text: `Instructions:\n- Propose 2-3 distinct solution ideas specific to the task.\n- Numbered list, each under 150 words.\n- Explicitly channel your artistic way of thinking and your thinking patterns (methods + competencies).\n- Make each proposal unique and innovative.` },
          ],
        }],
        tools,
        maxSteps: 6,
        temperature: 0.8,
      })

      // Parse the proposals into an array
      const proposals = text.split(/\n\s*(?:\d+\.|-\s)\s+/).map(s => s.trim()).filter(Boolean)
      const validProposals = proposals.slice(0, 3) // Ensure max 3 proposals
      
      ideations.push({ 
        sparkId: spark.id, 
        sparkName: spark.name, 
        proposals: validProposals 
      })
      
      await emit(runId, { type: 'agent:result', payload: { sparkId: spark.id, name: spark.name, text: validProposals.join('\n\n') } })
    } catch (e: any) {
      await emit(runId, { type: 'agent:error', payload: { sparkId: spark.id, name: spark.name, error: e?.message || 'Failed to ideate' } })
    } finally {
      await emit(runId, { type: 'agent:finished', payload: { sparkId: spark.id, name: spark.name } })
    }
  }

  // Check for cancellation before evaluation phase
  const currentRun = await prisma.projectRun.findUnique({ where: { id: runId }, select: { status: true } })
  if (currentRun?.status === 'cancelled') {
    console.log(`Run ${runId} was cancelled before evaluation, stopping processing`)
    return
  }

  // Special case: Single agent scenario
  if (assignedSparks.length === 1) {
    await emit(runId, { type: 'phase:single_agent', payload: { message: 'Single agent detected - skipping collaborative evaluation...' } })
    
    // For single agent, directly select top 3 proposals and create outputs
    const singleSpark = assignedSparks[0]
    const singleIdeation = ideations[0]
    
    if (singleIdeation && singleIdeation.proposals.length > 0) {
      // Take up to 3 proposals from the single agent
      const selectedProposals = singleIdeation.proposals.slice(0, 3).map((proposal, index) => ({
        sparkId: singleSpark.id,
        sparkName: singleSpark.name,
        proposal,
        proposalIndex: index
      }))

      await emit(runId, { type: 'single_agent:selected', payload: { 
        message: `Selected ${selectedProposals.length} proposals from ${singleSpark.name}`,
        proposals: selectedProposals.map(p => ({ sparkName: p.sparkName, proposal: p.proposal }))
      } })

      // Skip to output creation phase
      await emit(runId, { type: 'phase:outputs', payload: { message: 'Creating outputs with artist-generated titles...' } })
      
      // Process each selected proposal
      for (const selectedProposal of selectedProposals) {
        if (currentRun?.status === 'cancelled') return

        try {
          // Let the artist create a title for their own idea
          const mentalModels = await buildSparkMentalModelsSection(singleSpark.id)
          const titlePrompt = `\n\n---\n\nCore Directive:\n- You are ${singleSpark.name} creating a title for YOUR creative idea.\n- This is YOUR proposal that you've selected to develop.\n- Create a concise, catchy title that captures your artistic vision.`
          const system = mentalModels ? `${singleSpark.systemPrompt}\n\n---\n\n${mentalModels}${titlePrompt}` : `${singleSpark.systemPrompt}${titlePrompt}`

          const { text: titleOnly } = await generateText({
            model: openai('gpt-4o-mini'),
            system,
            messages: [{
              role: 'user',
              content: `This is YOUR creative idea. Create a concise, catchy title (max 8 words) that captures your artistic vision.\n\nYour idea: ${selectedProposal.proposal}\n\nRespond exactly as:\nTitle: [title here]`
            }],
            temperature: 0.8,
          })

          // Parse the response to extract title
          const titleMatch = titleOnly.match(/Title:\s*(.+?)(?:\n|$)/i)
          const title = titleMatch ? titleMatch[1].trim() : selectedProposal.proposal.split('\\n')[0].substring(0, 50)

          // Save the output
          const created = await db.output.create({
            data: { 
              projectId: project.id, 
              sparkId: selectedProposal.sparkId,
              title,
              text: selectedProposal.proposal,
              runId
            },
            include: { spark: true },
          })

          // Generate minimal SVG cover based on project name and task
          try {
            const { text: rawSvg } = await generateText({
              model: openai('gpt-4o-mini'),
              system: 'You generate concise, valid SVG markup only. No explanations. Output EXACTLY one <svg> element with viewBox="0 0 512 512" suitable for a square card. MUST be low-poly (triangles/polygons), abstract, composed of 5–15 shapes. Use SINGLE flat fill color for all shapes, NO gradients, NO strokes, NO external images or scripts.',
              messages: [{
                role: 'user',
                content: `Project Title: ${project.name}\nProject Task: ${project.task}\nCreate an abstract LOW-POLY SVG composed of 5 to 15 separate polygon shapes (triangles/quadrilaterals). No circles or curves. Use a SINGLE flat fill color for all shapes (frontend recolors), NO gradients, NO strokes. You MAY vary opacity per shape (0.35–1.0) to create layering. Freely position, scale, and rotate shapes to subtly reflect the idea's key concepts. NO text. Max 8KB. Output only the SVG element.`
              }],
              temperature: 0.4,
            })
            const raw = (rawSvg || '').trim()
            const m = raw.match(/<svg[\s\S]*?<\/svg>/i)
            const svg = m ? m[0] : raw
            if (svg.startsWith('<svg')) {
              await db.output.update({ where: { id: created.id }, data: { coverSvg: svg } })
            }
          } catch {}

          await emit(runId, { 
            type: 'output:created', 
            payload: { 
              id: created.id, 
              text: created.text, 
              title: (created as any).title || '', 
              sparkId: created.sparkId, 
              sparkName: (created as any).spark.name 
            } 
          })
        } catch (e: any) {
          await emit(runId, { type: 'outputs:error', payload: { error: (e as any)?.message || 'Failed to save output' } })
        }
      }

      // Mark as finished for single agent
      await prisma.projectRun.update({ where: { id: runId }, data: { status: 'finished', finishedAt: new Date() } })
      await emit(runId, { type: 'outputs:saved', payload: { count: selectedProposals.length } })
      await emit(runId, { type: 'run:finished' })
      return
    }
  }

  // Phase 2: Collaborative evaluation - agents present and evaluate each other's proposals
  await emit(runId, { type: 'phase:evaluation', payload: { message: 'Agents are evaluating each other\'s proposals...' } })
  
  const allProposals: { sparkId: string; sparkName: string; proposal: string; proposalIndex: number }[] = []
  
  // Flatten all proposals with attribution
  ideations.forEach((ideation, ideationIndex) => {
    ideation.proposals.forEach((proposal, proposalIndex) => {
      allProposals.push({
        sparkId: ideation.sparkId,
        sparkName: ideation.sparkName,
        proposal,
        proposalIndex
      })
    })
  })

  // Each spark evaluates all proposals and votes for top 3
  const evaluations: { sparkId: string; sparkName: string; votes: string[]; reasoning: string }[] = []

  for (const spark of assignedSparks) {
    // Re-check cancellation for each evaluation iteration
    const evalRun = await prisma.projectRun.findUnique({ where: { id: runId }, select: { status: true } })
    if (evalRun?.status === 'cancelled') return

    try {
      const mentalModels = await buildSparkMentalModelsSection(spark.id)
      const evaluationPrompt = `\n\n---\n\nCore Directive:\n- You are ${spark.name} evaluating creative proposals from your peers.\n- Apply your artistic perspective and thinking patterns to assess each proposal.\n- Be constructive but honest in your evaluation.`
      const system = mentalModels ? `${spark.systemPrompt}\n\n---\n\n${mentalModels}${evaluationPrompt}` : `${spark.systemPrompt}${evaluationPrompt}`

      const { text: evaluation } = await generateText({
        model: openai('gpt-4o-mini'),
        system,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Task: ${project.task}` },
            { type: 'text', text: `You are evaluating ${allProposals.length} creative proposals from your peers. Each proposal is numbered and attributed to its creator.` },
            { type: 'text', text: `Proposals to evaluate:\n${allProposals.map((p, i) => `${i + 1}. [${p.sparkName}]: ${p.proposal}`).join('\n\n')}` },
            { type: 'text', text: `Instructions:\n- Evaluate each proposal from your artistic perspective\n- Consider creativity, feasibility, and alignment with the task\n- Select your TOP 3 proposals (by number)\n- Provide brief reasoning for your top 3 choices\n\nFormat your response as:\nTop 3: [numbers separated by commas]\nReasoning: [your artistic assessment of why these are the strongest]` },
          ],
        }],
        temperature: 0.7,
      })

      // Parse the evaluation
      const top3Match = evaluation.match(/Top 3:\s*([\d,\s]+)/i)
      const reasoningMatch = evaluation.match(/Reasoning:\s*(.+?)(?:\n|$)/is)
      
      const top3Numbers = top3Match ? top3Match[1].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0 && n <= allProposals.length) : []
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided'
      
      // Get the actual proposals based on the numbers
      const votes = top3Numbers.map(num => allProposals[num - 1]?.proposal).filter(Boolean)
      
      evaluations.push({
        sparkId: spark.id,
        sparkName: spark.name,
        votes,
        reasoning
      })

      await emit(runId, { type: 'agent:evaluated', payload: { sparkId: spark.id, name: spark.name, votes: votes.length, reasoning } })
    } catch (e: any) {
      await emit(runId, { type: 'agent:evaluation_error', payload: { sparkId: spark.id, name: spark.name, error: e?.message || 'Failed to evaluate' } })
    }
  }

  // Phase 3: Voting aggregation - determine top 3 proposals by vote count
  await emit(runId, { type: 'phase:voting', payload: { message: 'Aggregating votes to determine top 3 proposals...' } })
  
  const proposalVotes: { [key: string]: number } = {}
  
  // Count votes for each proposal
  allProposals.forEach((proposal, index) => {
    const proposalKey = `${proposal.sparkName}: ${proposal.proposal.substring(0, 100)}...`
    proposalVotes[proposalKey] = 0
    
    evaluations.forEach(evaluation => {
      if (evaluation.votes.includes(proposal.proposal)) {
        proposalVotes[proposalKey]++
      }
    })
  })

  // Sort by vote count and select top 3
  const sortedProposals = Object.entries(proposalVotes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([proposalKey]) => {
      const originalProposal = allProposals.find(p => 
        `${p.sparkName}: ${p.proposal.substring(0, 100)}...` === proposalKey
      )
      return originalProposal
    })
    .filter(Boolean)

  await emit(runId, { type: 'voting:result', payload: { 
    topProposals: sortedProposals.map(p => ({ sparkName: p!.sparkName, proposal: p!.proposal })),
    voteCounts: proposalVotes
  } })

  // Phase 4: Output creation - each selected proposal gets processed by its creator
  await emit(runId, { type: 'phase:outputs', payload: { message: 'Creating final outputs with artist-generated titles...' } })

  for (const selectedProposal of sortedProposals) {
    if (!selectedProposal) continue
    
    // Re-check cancellation for each output creation iteration
    const outRun = await prisma.projectRun.findUnique({ where: { id: runId }, select: { status: true } })
    if (outRun?.status === 'cancelled') return

    try {
      // Find the original spark who created this proposal
      const originalSpark = assignedSparks.find(s => s.id === selectedProposal.sparkId)
      if (!originalSpark) continue

      // Let the original artist create a title for their own idea
      const mentalModels = await buildSparkMentalModelsSection(originalSpark.id)
      const titlePrompt = `\n\n---\n\nCore Directive:\n- You are ${originalSpark.name} creating a title for YOUR creative idea.\n- This is YOUR proposal that was selected by the group.\n- Create a concise, catchy title that captures your artistic vision.`
      const system = mentalModels ? `${originalSpark.systemPrompt}\n\n---\n\n${mentalModels}${titlePrompt}` : `${originalSpark.systemPrompt}${titlePrompt}`

      const { text: titleOnly } = await generateText({
        model: openai('gpt-4o-mini'),
        system,
        messages: [{
          role: 'user',
          content: `This is YOUR creative idea that was selected by the group. Create a concise, catchy title (max 8 words) that captures your artistic vision.\n\nYour idea: ${selectedProposal.proposal}\n\nRespond exactly as:\nTitle: [title here]`
        }],
        temperature: 0.8,
      })

      // Parse the response to extract title
      const titleMatch = titleOnly.match(/Title:\s*(.+?)(?:\n|$)/i)
      const title = titleMatch ? titleMatch[1].trim() : selectedProposal.proposal.split('\\n')[0].substring(0, 50)

      // Save the entire proposal for reference
      const created = await db.output.create({
        data: { 
          projectId: project.id, 
          sparkId: selectedProposal.sparkId, // Original creator gets attribution
          title,
          text: selectedProposal.proposal, // Full proposal text
          runId
        },
        include: { spark: true },
      })

      // Generate minimal SVG cover based on project name and task
      try {
        const { text: rawSvg } = await generateText({
          model: openai('gpt-4o-mini'),
          system: 'You generate concise, valid SVG markup only. No explanations. Output EXACTLY one <svg> element with viewBox="0 0 512 512" suitable for a square card. MUST be low-poly (triangles/polygons), abstract, composed of 5–15 shapes. Use SINGLE flat fill color for all shapes, NO gradients, NO strokes, NO external images or scripts.',
          messages: [{
            role: 'user',
            content: `Project Title: ${project.name}\nProject Task: ${project.task}\nCreate an abstract LOW-POLY SVG composed of 5 to 15 separate polygon shapes (triangles/quadrilaterals). No circles or curves. Use a SINGLE flat fill color for all shapes (frontend recolors), NO gradients, NO strokes. You MAY vary opacity per shape (0.35–1.0) to create layering. Freely position, scale, and rotate shapes to subtly reflect the idea's key concepts. NO text. Max 8KB. Output only the SVG element.`
          }],
          temperature: 0.4,
        })
        const raw = (rawSvg || '').trim()
        const m = raw.match(/<svg[\s\S]*?<\/svg>/i)
        const svg = m ? m[0] : raw
        if (svg.startsWith('<svg')) {
          await db.output.update({ where: { id: created.id }, data: { coverSvg: svg } })
        }
      } catch {}

      await emit(runId, { 
        type: 'output:created', 
        payload: { 
          id: created.id, 
          text: created.text, 
          title: (created as any).title || '', 
          sparkId: created.sparkId, 
          sparkName: (created as any).spark.name 
        } 
      })
    } catch (e: any) {
      await emit(runId, { type: 'outputs:error', payload: { error: (e as any)?.message || 'Failed to save output' } })
    }
  }

  // Final cancellation check before marking as finished
  const finalRun = await prisma.projectRun.findUnique({ where: { id: runId }, select: { status: true } })
  if (finalRun?.status === 'cancelled') {
    console.log(`Run ${runId} was cancelled before completion, stopping`)
    return
  }

  await prisma.projectRun.update({ where: { id: runId }, data: { status: 'finished', finishedAt: new Date() } })
  await emit(runId, { type: 'outputs:saved', payload: { count: sortedProposals.length } })
  await emit(runId, { type: 'run:finished' })
}


