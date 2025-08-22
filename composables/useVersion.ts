import { computed } from 'vue'
import { useRuntimeConfig } from '#app'

export const useVersion = () => {
  const config = useRuntimeConfig()
  const version = computed(() => {
    const configVersion = config.public.version as string
    return ['commercial', 'research'].includes(configVersion) ? configVersion : 'commercial'
  })

  const fontFamily = computed(() =>
    version.value === 'research'
      ? 'Helvetica, Arial, sans-serif'
      : 'Px Grotesk, sans-serif'
  )

  const isHfbk = computed(() => {
    if (typeof window !== 'undefined') {
      return window.location.host.endsWith('hfbk.net')
    }
    return false
  })

  // Add versionConfig with footerLinks
  const versionConfig = computed(() => {
    return {
      footerLinks: [
        { to: isHfbk.value ? '/hfbk/imprint' : '/legal/imprint', text: 'Imprint', external: false },
        { to: isHfbk.value ? '/hfbk/dataprivacy' : '/legal/dataprivacy', text: 'Privacy', external: false },
        { to: isHfbk.value ? '/hfbk/terms' : '/legal/terms', text: 'Terms', external: false }
      ]
    }
  })

  return {
    version,
    versionConfig,
    fontFamily
  }
} 