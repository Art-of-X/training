export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  const { steps, artist, user_id, individual, meta_spark_config } = body
  
  // Validate input
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'steps array is required'
    })
  }
  
  // Get GitHub config from runtime config
  const config = useRuntimeConfig()
  const githubToken = config.githubToken
  const githubRepo = config.githubRepo
  
  if (!githubToken || !githubRepo) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GitHub configuration missing'
    })
  }
  
  try {
    // Try to trigger GitHub Actions workflow
    const response = await $fetch(`https://api.github.com/repos/${githubRepo}/actions/workflows/pipeline.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nuxt3-Pipeline-Trigger'
      },
      body: {
        ref: 'main',
        inputs: {
          steps: steps.join(','),
          artist: artist || '',
          user_id: user_id || '',
          individual: individual ? 'true' : 'false',
          meta_spark_config: meta_spark_config || ''
        }
      }
    })
    
    return {
      success: true,
      message: 'Pipeline triggered successfully',
      workflow_url: `https://github.com/${githubRepo}/actions`,
      note: 'Check GitHub Actions for execution status'
    }
  } catch (error) {
    // If workflow doesn't exist or has different inputs, provide helpful error
    if (error.statusCode === 422) {
      throw createError({
        statusCode: 422,
        statusMessage: 'GitHub Actions workflow not configured properly',
        message: `Workflow 'pipeline.yml' not found or missing required inputs. Please ensure the workflow file exists at .github/workflows/pipeline.yml with the correct input parameters.`
      })
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to trigger pipeline',
      message: `GitHub API error: ${error.message || 'Unknown error'}`
    })
  }
})
