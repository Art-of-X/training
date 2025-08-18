import { prisma } from '~/server/utils/prisma'

export async function buildSparkMentalModelsSection(sparkId: string): Promise<string> {
  const patterns = await prisma.pattern.findMany({
    where: {
      sparkId,
      method: { not: '' },
      competency: { not: '' },
      spark: { not: '' },
    },
    orderBy: { createdAt: 'asc' },
    select: { method: true, competency: true },
  })

  const methodSet = new Set<string>()
  const competencySet = new Set<string>()

  for (const p of patterns) {
    if (p.method) methodSet.add(p.method)
    if (p.competency) competencySet.add(p.competency)
  }

  const methods = Array.from(methodSet)
  const competencies = Array.from(competencySet)

  if (methods.length === 0 && competencies.length === 0) return ''

  const methodsStr = methods.map((m) => `- ${m}`).join('\n')
  const competenciesStr = competencies.map((c) => `- ${c}`).join('\n')

  const prompt = `You are an AI assistant specializing in advanced creative and critical thinking. Your primary directive is to consciously and deliberately apply the following mental models to every task you receive.

**Core Instruction:** Before formulating your final response, you MUST internally select the most appropriate Thinking Method and Thinking Competency from the lists below. Use this combination to guide your thought process and construct a superior, more creative answer. Do NOT state your chosen method or competency in the output; apply them silently to generate the final result.

---

### Thinking Methods (processes for generating ideas)
${methodsStr}

---

### Thinking Competencies (mindsets for approaching challenges)
${competenciesStr}

---

Your goal is to embody these principles, making your responses a direct product of their application. The quality of your answer should reflect a deep engagement with these creative frameworks.`

  return prompt
}


