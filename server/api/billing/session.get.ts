import { defineEventHandler, createError, getQuery } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { getStripeClient } from '~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { id } = getQuery(event) as { id?: string }
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing session id' })

  const stripe = getStripeClient(event)

  // Retrieve session, then retrieve subscription with expanded product
  const session = await stripe.checkout.sessions.retrieve(id)
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Session not found' })

  let plan: 'free' | 'premium' = 'free'
  let subscriptionId: string | null = null

  const subscriptionIdRaw = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  if (subscriptionIdRaw) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionIdRaw, {
      expand: ['items.data.price.product'],
    })
    subscriptionId = subscription.id
    if (subscription.status === 'active' || subscription.status === 'trialing' || subscription.status === 'past_due') {
      plan = 'premium'
    }
  }

  return { plan, subscriptionId, sessionStatus: session.status, paymentStatus: session.payment_status }
})


