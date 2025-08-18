import { ref, computed, watch, isRef, type Ref } from 'vue'
import { useUserProfile } from '~/composables/useUserProfile'

type Pattern = {
  id: number | string
  userId?: string | null
  sparkId?: string | null
  method?: string | null
  competency?: string | null
}

export function useTrainingProgress(sparkId?: Ref<string | undefined> | string | undefined) {
  const { userProfile } = useUserProfile()

  const requiredMethods = 3
  const requiredCompetencies = 3

  const loading = ref(false)
  const error = ref<string | null>(null)
  const patterns = ref<Pattern[]>([])

  const sparkIdRef: Ref<string | undefined> = isRef(sparkId)
    ? (sparkId as Ref<string | undefined>)
    : ref(sparkId as string | undefined)

  async function fetchPatterns() {
    if (!userProfile.value?.id) return
    loading.value = true
    error.value = null
    try {
      const res: any = await $fetch(`/api/patterns/${userProfile.value.id}`)
      const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
      patterns.value = data as Pattern[]
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || 'Failed to load patterns'
      patterns.value = []
    } finally {
      loading.value = false
    }
  }

  watch(
    [() => userProfile.value?.id, sparkIdRef],
    () => {
      fetchPatterns()
    },
    { immediate: true }
  )

  const filtered = computed(() => {
    const sid = sparkIdRef.value
    const list = patterns.value || []
    if (sid) return list.filter((p) => p.sparkId === sid)
    // When no spark filter is provided, include all returned patterns (API already scoped to user and their sparks)
    return list
  })

  const uniqueMethodsCount = computed(() => {
    const set = new Set<string>()
    for (const p of filtered.value) {
      if (p.method && p.method.trim().length > 0) set.add(p.method.trim().toLowerCase())
    }
    return set.size
  })

  const uniqueCompetenciesCount = computed(() => {
    const set = new Set<string>()
    for (const p of filtered.value) {
      if (p.competency && p.competency.trim().length > 0) set.add(p.competency.trim().toLowerCase())
    }
    return set.size
  })

  const progressPercent = computed(() => {
    const methodsRatio = Math.min(1, uniqueMethodsCount.value / requiredMethods)
    const competenciesRatio = Math.min(1, uniqueCompetenciesCount.value / requiredCompetencies)
    return Math.round(((methodsRatio + competenciesRatio) / 2) * 100)
  })

  const isEligible = computed(() =>
    uniqueMethodsCount.value >= requiredMethods && uniqueCompetenciesCount.value >= requiredCompetencies
  )

  return {
    loading,
    error,
    patterns,
    uniqueMethodsCount,
    uniqueCompetenciesCount,
    requiredMethods,
    requiredCompetencies,
    progressPercent,
    isEligible,
    refresh: fetchPatterns,
  }
}


