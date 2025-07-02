import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../utils/prisma'
import fs from 'fs/promises'
import path from 'path'

// Demographics data - fallback for when JSON file is not accessible
const fallbackDemographics = {
  "demographics": [
    {
      "key": "parents_birthplace",
      "question": "Are you and your parents born in the country you live permanently?",
      "type": "multiple_choice",
      "options": ["Yes", "No", "Prefer not to say"],
      "category": "identity",
      "required": false,
      "order": 1
    },
    {
      "key": "citizenship",
      "question": "Do you have the citizenship of the country in which you live?",
      "type": "multiple_choice",
      "options": ["Yes", "No", "Prefer not to say"],
      "category": "identity",
      "required": false,
      "order": 2
    },
    {
      "key": "marginalized_minority",
      "question": "Do you belong to a marginalized minority?",
      "type": "multiple_choice",
      "options": ["Yes", "No", "Prefer not to say"],
      "category": "identity",
      "required": false,
      "order": 3
    },
    {
      "key": "gender",
      "question": "What is your gender?",
      "type": "multiple_choice",
      "options": ["Female", "Male", "Non-binary", "Other", "Prefer not to say"],
      "category": "basic",
      "required": false,
      "order": 4
    },
    {
      "key": "age",
      "question": "What is your age?",
      "type": "number",
      "category": "basic",
      "required": false,
      "order": 5
    },
    {
      "key": "education",
      "question": "What is your highest level of education completed?",
      "type": "multiple_choice",
      "options": [
        "Bachelor - Art School - Scientific University - University of Applied Science",
        "Master - Art School - Scientific University - University of Applied Science", 
        "PhD - Art School - Scientific University",
        "No Academic Degree - Craft Training - Other Training - High School"
      ],
      "category": "education",
      "required": false,
      "order": 6
    },
    {
      "key": "work_status",
      "question": "What is your current work status?",
      "type": "multiple_choice",
      "options": [
        "I earn my living with artistic/creative work",
        "I earn a substantial part of my living with artistic/creative work",
        "I essentially earn my living with non-artistic/non-creative work",
        "I am dependent on social welfare",
        "I am a student"
      ],
      "category": "professional",
      "required": false,
      "order": 7
    },
    {
      "key": "income",
      "question": "What is your approximate annual household income (Euro)?",
      "type": "multiple_choice",
      "options": [
        "Less than Euro 25,000",
        "Euro 25,000 - Euro 49,999",
        "Euro 50,000 - Euro 74,999",
        "Euro 75,000 - Euro 99,999",
        "Euro 100,000 - Euro 149,999",
        "Euro 150,000 - Euro 199,999",
        "Euro 200,000 or more",
        "Prefer not to say"
      ],
      "category": "socioeconomic",
      "required": false,
      "order": 8
    },
    {
      "key": "creative_field",
      "question": "What is your primary artistic/creative field?",
      "type": "multiple_choice",
      "options": [
        "Fine Arts - Painting - Drawing - Sculpture - Timebased Media - Performance - Photography",
        "Design - Product - Grafik - Fashion - Media - Photography",
        "Film - Feature - Documentary - Advertorial",
        "Literature",
        "Performing Arts - Theater - Dance - Classical Music - Popular Music",
        "Architecture",
        "Other"
      ],
      "category": "professional",
      "required": false,
      "order": 9
    },
    {
      "key": "financial_stability",
      "question": "On a scale of 1-10, how would you rate your current financial stability (1 = low stability, 10 = highest stability)?",
      "type": "range",
      "category": "socioeconomic",
      "required": false,
      "order": 10,
      "min": 1,
      "max": 10
    },
    {
      "key": "dependents",
      "question": "Do you have dependents (children, elderly parents, etc.)?",
      "type": "multiple_choice",
      "options": ["Yes", "No", "Prefer not to say"],
      "category": "socioeconomic",
      "required": false,
      "order": 11
    },
    {
      "key": "relationship_status",
      "question": "What is your relationship status?",
      "type": "multiple_choice",
      "options": [
        "Single",
        "In a relationship",
        "Married",
        "Divorced",
        "Widowed",
        "Prefer not to say"
      ],
      "category": "basic",
      "required": false,
      "order": 12
    }
  ]
}

async function getDemographicsData() {
  // Try multiple paths for the demographics file
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'demographics.json'),
    path.join(process.cwd(), '..', 'data', 'demographics.json'),
    path.join(__dirname, '..', '..', '..', 'data', 'demographics.json'),
    path.join('/var/task', 'data', 'demographics.json')
  ]
  
  for (const jsonPath of possiblePaths) {
    try {
      const jsonContent = await fs.readFile(jsonPath, 'utf-8')
      const data = JSON.parse(jsonContent)
      console.log(`Successfully loaded demographics from: ${jsonPath}`)
      return data
    } catch (error) {
      // Continue to next path
      continue
    }
  }
  
  // Fallback to embedded data if file not found
  console.log('Using fallback demographics data')
  return fallbackDemographics
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    // Get demographics data from file or fallback
    const { demographics } = await getDemographicsData()

    // Get user's existing answers
    const existingAnswers = await prisma.demographicsAnswer.findMany({
      where: {
        userId: user.id
      }
    })

    // Map existing answers for quick lookup
    const answersMap = existingAnswers.reduce((acc: Record<string, string>, answer: any) => {
      acc[answer.questionKey] = answer.answer
      return acc
    }, {} as Record<string, string>)

    // Return questions with existing answers
    const questionsWithAnswers = demographics
      .sort((a: any, b: any) => a.order - b.order)
      .map((question: any) => ({
        ...question,
        currentAnswer: answersMap[question.key] || null
      }))

    return questionsWithAnswers
  } catch (error) {
    console.error('Error fetching demographics questions:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }
}) 