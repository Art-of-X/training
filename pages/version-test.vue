<template>
  <div class="py-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">Version Configuration Test</h1>
      
      <div class="card mb-6">
        <div class="card-body">
          <h2 class="text-xl font-semibold mb-4">Current Configuration</h2>
          <div class="space-y-2">
            <p><strong>Version:</strong> {{ version }}</p>
            <p><strong>Font Family:</strong> {{ versionConfig.fontFamily }}</p>
            <p><strong>Primary Color:</strong> {{ versionConfig.primaryColor }}</p>
            <p><strong>Policy Type:</strong> {{ versionConfig.policyType }}</p>
            <p><strong>Theme:</strong> {{ versionConfig.theme }}</p>
          </div>
        </div>
      </div>

      <div class="card mb-6">
        <div class="card-body">
          <h2 class="text-xl font-semibold mb-4">Version Flags</h2>
          <div class="space-y-2">
            <p><strong>Is Commercial:</strong> {{ isCommercial }}</p>
            <p><strong>Is Research:</strong> {{ isResearch }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h2 class="text-xl font-semibold mb-4">Test Styling</h2>
          <div class="space-y-4">
            <button class="btn-primary">Primary Button</button>
            <p class="text-primary-600">Primary text color</p>
            <p class="rainbow-text">Rainbow text effect</p>
          </div>
        </div>
      </div>

      <div class="mt-6">
        <NuxtLink to="/training/dashboard" class="btn-secondary">
          Back to Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Version Test'
})

const { version, isCommercial, isResearch, versionConfig } = useVersion()
</script>

<style scoped>
.rainbow-text {
  background: linear-gradient(120deg, #3b82f6, #a855f7, #ec4899, #22d3ee);
  background-size: 300% 300%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: water-flow 15s ease-in-out infinite;
}

@keyframes water-flow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style> 