import Stripe from 'stripe'
import { H3Event, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

export function getStripeClient(event: H3Event) {
  const config = useRuntimeConfig(event)
  const sk = config.stripeSk as string | undefined
  if (!sk) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe secret key not configured' })
  }
  return new Stripe(sk, { apiVersion: '2024-06-20' })
}

export type PlanTier = 'free' | 'premium'

export const PLAN_LIMITS: Record<PlanTier, { projects: number; sparks: number }> = {
  free: { projects: 3, sparks: 3 },
  premium: { projects: 10, sparks: 8 },
}

export function getPremiumProductId(event: H3Event) {
  const config = useRuntimeConfig(event)
  const pid = config.stripePremiumPid as string | undefined
  if (!pid) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe premium product id not configured' })
  }
  return pid
}

export async function resolveUserPlan(event: H3Event): Promise<{ plan: PlanTier; subscriptionId?: string | null }> {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Default plan
  let plan: PlanTier = 'free'
  let subscriptionId: string | null = null

  try {
    const stripe = getStripeClient(event)
    const premiumProductId = getPremiumProductId(event)
    const email = user.email || undefined
    if (!email) return { plan, subscriptionId }

    // Collect all customers that match this email (there can be multiple)
    let allCustomers: Stripe.Customer[] = []
    try {
      const search = await stripe.customers.search({ query: `email:'${email}'`, limit: 100 })
      allCustomers = search.data
      // Fallback to list if search returns nothing
      if (allCustomers.length === 0) {
        const list = await stripe.customers.list({ email, limit: 100 })
        allCustomers = list.data
      }
    } catch {
      try {
        const list = await stripe.customers.list({ email, limit: 100 })
        allCustomers = list.data
      } catch {}
    }

    // Allowed statuses to treat as premium
    const premiumStatuses = new Set<Stripe.Subscription.Status>(['active', 'trialing', 'past_due', 'unpaid'])

    for (const c of allCustomers) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: c.id,
          status: 'all',
          expand: ['data.items.data.price.product'],
          limit: 50,
        })
        for (const s of subs.data) {
          if (!premiumStatuses.has(s.status)) continue
          for (const item of s.items.data) {
            const product = item.price.product as Stripe.Product
            if (product && product.id === premiumProductId) {
              plan = 'premium'
              subscriptionId = s.id
              return { plan, subscriptionId }
            }
          }
        }
      } catch {}
    }
  } catch (e) {
    // Swallow errors and assume free plan
  }

  return { plan, subscriptionId }
}


