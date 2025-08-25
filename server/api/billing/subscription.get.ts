import { defineEventHandler } from 'h3'
import Stripe from 'stripe'
import { getStripeClient, resolveUserPlan, getPremiumProductId } from '~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const { plan, subscriptionId } = await resolveUserPlan(event)
  let product: { id: string; name: string; description: string } | null = null
  let prices: Array<{ id: string; nickname: string | null; unitAmount: number | null; currency: string; interval: Stripe.Price.Recurring.Interval | null }> = []

  try {
    const stripe = getStripeClient(event)
    const premiumProductId = getPremiumProductId(event)
    const p = await stripe.products.retrieve(premiumProductId)
    const pr = await stripe.prices.list({ product: premiumProductId, active: true, limit: 10 })
    product = { id: p.id, name: p.name, description: p.description || '' }
    prices = pr.data.map((x) => ({ id: x.id, nickname: x.nickname || null, unitAmount: x.unit_amount, currency: x.currency, interval: (x.recurring?.interval || null) as Stripe.Price.Recurring.Interval | null }))
  } catch {
    // Keep product/prices null if retrieval fails, but still return plan
  }

  return { plan, subscriptionId, product, prices }
})


