<template>
  <footer class="fixed bottom-0 left-0 right-0 bg-transparent p-4 z-50">
    <div class="container-wide mx-auto">
      <div class="flex justify-center items-center space-x-4">
        <NuxtLink :to="imprintLink" class="text-xs text-neutral-800 hover:underline">Imprint</NuxtLink>
        <span class="text-xs text-neutral-700">|</span>
        <NuxtLink :to="dataprivacyLink" class="text-xs text-neutral-800 hover:underline">Data Privacy</NuxtLink>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import { ref, onMounted } from 'vue'

const imprintLink = ref('/legal/imprint')
const dataprivacyLink = ref('/legal/dataprivacy')

onMounted(() => {
  if (typeof window !== 'undefined' && window.location.host.endsWith('hfbk.net')) {
    imprintLink.value = '/hfbk/imprint'
    dataprivacyLink.value = '/hfbk/dataprivacy'
  }
})
</script> 