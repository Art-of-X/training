import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.userProfile.findFirst()

  if (!user) {
    console.error('No users found. Please create a user before seeding.')
    return
  }

  console.log(`Seeding portfolio items for user: ${user.name} (${user.id})`)

  const portfolioItems = [
    {
      userId: user.id,
      description: 'A beautiful landscape photograph.',
      filePath: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    },
    {
      userId: user.id,
      description: 'An interesting article about AI.',
      link: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
    },
    {
      userId: user.id,
      description: 'A short video clip of the ocean.',
      filePath: 'https://videos.pexels.com/video-files/853828/853828-hd_1920_1080_25fps.mp4',
    },
    {
        userId: user.id,
        description: 'A personal project website.',
        link: 'https://www.artx.fyi/',
    },
  ]

  for (const item of portfolioItems) {
    await prisma.portfolioItem.create({
      data: item,
    })
  }

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
