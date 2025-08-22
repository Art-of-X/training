import { defineEventHandler } from 'h3'
import Stripe from 'stripe'
import { getStripeClient, resolveUserPlan, PREMIUM_PRODUCT_ID } from '~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const { plan, subscriptionId } = await resolveUserPlan(event)
  const stripe = getStripeClient(event)

  // Fetch product and price info for premium tier
  const product = await stripe.products.retrieve(PREMIUM_PRODUCT_ID)
  const prices = await stripe.prices.list({ product: PREMIUM_PRODUCT_ID, active: true, limit: 10 })

  return {
    plan,
    subscriptionId,
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
    },
    prices: prices.data.map(p => ({ id: p.id, nickname: p.nickname, unitAmount: p.unit_amount, currency: p.currency, interval: (p.recurring?.interval || null) as Stripe.Price.Recurring.Interval | null })),
  }
})


