import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { getStripeClient, getPremiumProductId } from '~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const stripe = getStripeClient(event)
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public?.siteUrl as string) || (getRequestURL(event).origin)
  const premiumProductId = getPremiumProductId(event)

  // Find or create customer by email
  const email = user.email
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Email required' })

  let customerId: string | undefined
  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data[0]) customerId = existing.data[0].id
  else {
    const created = await stripe.customers.create({ email })
    customerId = created.id
  }

  // Pick the first active recurring price for the product
  const prices = await stripe.prices.list({ product: premiumProductId, active: true, type: 'recurring', limit: 1 })
  if (!prices.data[0]) throw createError({ statusCode: 500, statusMessage: 'No active price for premium product' })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: prices.data[0].id, quantity: 1 }],
    success_url: `${siteUrl}/training/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/training/settings?checkout=cancel`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  })

  return { url: session.url }
})


