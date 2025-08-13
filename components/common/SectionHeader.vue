<template>
  <div class="flex items-center justify-end gap-x-2 mb-4">
    <h2 class="text-xl font-bold">{{ title }}</h2>
    <button v-if="hasAdd" @click="$emit('add')" class="p-1 add-tile rounded-md">
      <div class="add-icon-mask w-6 h-6" aria-hidden="true"></div>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true,
  },
  hasAdd: {
    type: Boolean,
    default: true,
  }
});
defineEmits(['add']);
</script>

<style scoped>
.add-tile { 
  background-color: hsl(var(--color-primary-500)); 
}
.add-icon-mask {
  background-color: var(--header-nav-active-color);
  -webkit-mask: url("/svg/icons/Add.svg") center / contain no-repeat;
  mask: url("/svg/icons/Add.svg") center / contain no-repeat;
}
</style>
