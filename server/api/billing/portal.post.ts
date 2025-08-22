import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { getStripeClient } from '~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const stripe = getStripeClient(event)
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public?.siteUrl as string) || (getRequestURL(event).origin)

  const email = user.email
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Email required' })

  const customers = await stripe.customers.list({ email, limit: 1 })
  const customer = customers.data[0]
  if (!customer) throw createError({ statusCode: 400, statusMessage: 'No Stripe customer found for user' })

  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${siteUrl}/training/settings?portal=return`,
  })

  return { url: portal.url }
})


