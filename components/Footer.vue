<template>
  <footer class="fixed bottom-0 left-0 right-0 bg-transparent p-4 z-50">
    <div class="container-wide mx-auto">
      <div class="flex justify-center items-center space-x-4">
        <NuxtLink
          v-for="link in versionConfig.footerLinks"
          :key="link.to"
          :to="link.to"
          :external="link.external"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noopener noreferrer' : undefined"
          class="text-xs text-secondary-500 hover:text-primary-500 dark:text-secondary-400 dark:hover:text-primary-400 transition-colors"
        >
          {{ link.text }}
        </NuxtLink>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useVersion } from '~/composables/useVersion';

const { versionConfig } = useVersion();
</script> 