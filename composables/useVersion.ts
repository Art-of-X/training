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

  return {
    version,
    imprintLink: '/hfbk/imprint',
    dataprivacyLink: '/hfbk/dataprivacy',
    fontFamily
  }
} 