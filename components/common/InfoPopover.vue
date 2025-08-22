<template>
  <!-- Popover content only -->
  <div
    v-if="isVisible"
    class="popover-content"
    :style="{ ...popoverStyle, ...positionStyle }"
    role="tooltip"
  >
    <div class="popover-body">
      <slot>{{ description }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { primaryColor, secondaryColor } from '~/composables/useDynamicColors'

interface Props {
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  triggerElement?: HTMLElement | null
}

const props = withDefaults(defineProps<Props>(), {
  position: 'right',
  delay: 300,
  triggerElement: null
})

const isVisible = ref(false)
let timeoutId: NodeJS.Timeout | null = null

const showPopover = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  isVisible.value = true
}

const hidePopover = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  isVisible.value = false
}

// Expose methods for parent component
defineExpose({
  show: showPopover,
  hide: hidePopover
})



const popoverStyle = computed(() => ({
  backgroundColor: primaryColor.value,
  color: secondaryColor.value,
}))

const positionStyle = computed(() => {
  if (!props.triggerElement) return {}
  
  const rect = props.triggerElement.getBoundingClientRect()
  
  if (props.position === 'right') {
    return {
      left: `${rect.right}px`,
      top: `${rect.top}px`,
    }
  }
  
  return {}
})


</script>

<style scoped>
.popover-content {
  @apply fixed z-[99999] px-3 py-2  text-sm  rounded-lg;
  @apply max-w-xs w-max;
}

.popover-body {
  @apply leading-relaxed;
}
</style>
