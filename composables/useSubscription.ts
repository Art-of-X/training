import { ref, computed } from 'vue'

const planRef = ref<'free' | 'premium'>('free')
const productRef = ref<{ id: string; name: string; description: string } | null>(null)
const pricesRef = ref<Array<{ id: string; nickname?: string | null; unitAmount: number | null; currency: string; interval: string | null }>>([])
const subscriptionIdRef = ref<string | null>(null)
const loadedRef = ref(false)
let loadingPromise: Promise<void> | null = null

export function useSubscription() {
  async function loadSubscription(force = false) {
    if (!force && loadedRef.value && pricesRef.value.length > 0) return
    if (loadingPromise) return loadingPromise
    loadingPromise = (async () => {
      try {
        const sub = await $fetch<any>('/api/billing/subscription')
        planRef.value = sub.plan
        productRef.value = sub.product || null
        pricesRef.value = (sub.prices || []).map((p: any) => ({
          id: p.id,
          nickname: p.nickname ?? null,
          unitAmount: p.unitAmount ?? null,
          currency: p.currency,
          interval: p.interval ?? null,
        }))
        subscriptionIdRef.value = sub.subscriptionId || null
      } catch {
        // ignore; keep defaults
      } finally {
        loadedRef.value = true
        loadingPromise = null
      }
    })()
    return loadingPromise
  }

  function refresh() {
    loadedRef.value = false
    return loadSubscription(true)
  }

  return {
    plan: planRef,
    product: productRef,
    prices: pricesRef,
    subscriptionId: subscriptionIdRef,
    loaded: loadedRef,
    loadSubscription,
    refresh,
    maxSparks: computed(() => (planRef.value === 'premium' ? 8 : 3)),
    maxProjects: computed(() => (planRef.value === 'premium' ? 10 : 3)),
  }
}


