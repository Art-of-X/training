import { ref } from 'vue'

// Global, shared upgrade modal state
const isUpgradeModalOpen = ref(false)
const isUpgrading = ref(false)
const upgradeModalTitle = ref('Upgrade Required')
const upgradeModalMessage = ref('Unlock premium features to continue')

async function startCheckoutRedirect() {
  isUpgrading.value = true
  try {
    // Nuxt $fetch is globally available in setup contexts; use native fetch here
    // but in components we will call the method, so rely on $fetch via global.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = await (globalThis as any).$fetch?.('/api/billing/checkout', { method: 'POST' })
      ?? await fetch('/api/billing/checkout', { method: 'POST' }).then(res => res.json())
    if (process.client && r?.url) window.location.href = r.url
  } catch (e) {
    // Best-effort; UI can surface errors where needed
  } finally {
    isUpgrading.value = false
  }
}

export function useUpgradeModal() {
  function openUpgradeModal(params?: { title?: string; message?: string }) {
    if (params?.title) upgradeModalTitle.value = params.title
    if (params?.message) upgradeModalMessage.value = params.message
    isUpgradeModalOpen.value = true
  }

  function closeUpgradeModal() {
    isUpgradeModalOpen.value = false
  }

  async function upgradeNow() {
    await startCheckoutRedirect()
  }

  return {
    // state
    isUpgradeModalOpen,
    isUpgrading,
    upgradeModalTitle,
    upgradeModalMessage,
    // actions
    openUpgradeModal,
    closeUpgradeModal,
    upgradeNow,
  }
}


