<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 overflow-y-auto"
    @click.self="closeModal"
  >
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
    
    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-4xl bg-white dark:bg-secondary-900 shadow-xl">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700">
          <h2 class="text-2xl font-bold text-secondary-900 dark:text-white">
            {{ version === 'research' ? 'Research Study Information' : 'Privacy Policy & Terms' }}
          </h2>
          <button 
            @click="closeModal"
            class="text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <!-- Content -->
        <div class="p-6 max-h-96 overflow-y-auto policy-content">
          <div v-if="version === 'research'" v-html="researchPolicy"></div>
          <div v-else v-html="commercialPolicy"></div>
        </div>
        
        <!-- Footer -->
        <div class="flex justify-end gap-4 p-6 border-t border-secondary-200 dark:border-secondary-700">
          <button 
            @click="closeModal"
            class="btn-secondary"
          >
            Close
          </button>
          <button 
            @click="acceptPolicy"
            class="btn-primary"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { version, versionConfig } = useVersion()

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  accept: []
}>()

// Policy content
const commercialPolicy = ref('')
const researchPolicy = ref('')

// Load policy content
const loadPolicyContent = async () => {
  try {
    // Using fetch to get the markdown content
    const [commercialResponse, researchResponse] = await Promise.all([
      fetch('/content/policy-commercial.md'),
      fetch('/content/policy-research.md')
    ])
    
    if (commercialResponse.ok) {
      const commercialText = await commercialResponse.text()
      commercialPolicy.value = markdownToHtml(commercialText)
    } else {
      console.warn('Failed to load commercial policy, using fallback')
      commercialPolicy.value = `
        <h1>Privacy Policy & Terms of Use</h1>
        <p>This platform processes your data to provide AI training services.</p>
        <p>For questions, contact our support team.</p>
      `
    }
    
    if (researchResponse.ok) {
      const researchText = await researchResponse.text()
      researchPolicy.value = markdownToHtml(researchText)
    } else {
      console.warn('Failed to load research policy, using fallback')
      researchPolicy.value = `
        <h1>Research Study Information & Consent</h1>
        <p>You are participating in a scientific research study conducted by HFBK Hamburg.</p>
        <p>For more information, please contact the research team.</p>
      `
    }
  } catch (error) {
    console.error('Failed to load policy content:', error)
    // Fallback content based on version
    if (version.value === 'research') {
      researchPolicy.value = `
        <h1>Research Study Information & Consent</h1>
        <p>You are participating in a scientific research study conducted by HFBK Hamburg.</p>
        <p>For more information, please contact the research team.</p>
      `
    } else {
      commercialPolicy.value = `
        <h1>Privacy Policy & Terms of Use</h1>
        <p>This platform processes your data to provide AI training services.</p>
        <p>For questions, contact our support team.</p>
      `
    }
  }
}

// Simple markdown to HTML converter (basic implementation)
const markdownToHtml = (markdown: string): string => {
  return markdown
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    // Fix multiple paragraphs
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-6]>)/g, '$1')
    .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
}

const closeModal = () => {
  emit('close')
}

const acceptPolicy = () => {
  emit('accept')
  closeModal()
}

// Load content when component mounts
onMounted(loadPolicyContent)
</script>

<style scoped>
.policy-content {
  line-height: 1.6;
}

.policy-content :deep(h1) {
  @apply text-2xl font-bold mb-4 text-secondary-900 dark:text-white;
}

.policy-content :deep(h2) {
  @apply text-xl font-semibold mb-3 mt-6 text-secondary-900 dark:text-white;
}

.policy-content :deep(h3) {
  @apply text-lg font-semibold mb-2 mt-4 text-secondary-900 dark:text-white;
}

.policy-content :deep(p) {
  @apply mb-4 text-secondary-600 dark:text-secondary-300;
}

.policy-content :deep(ul) {
  @apply mb-4 ml-6 text-secondary-600 dark:text-secondary-300;
}

.policy-content :deep(li) {
  @apply mb-1;
  list-style-type: disc;
}

.policy-content :deep(strong) {
  @apply font-semibold text-secondary-900 dark:text-white;
}

.policy-content :deep(em) {
  @apply italic;
}
</style> 