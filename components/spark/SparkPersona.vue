<template>
  <div 
    class="relative aspect-square rounded-lg flex items-center justify-center cursor-pointer group"
    :style="{ backgroundColor: persona.color }"
    @click="$emit('select', persona.id)"
  >
    <div class="x-mask w-1/2 h-1/2 transition-transform duration-300 ease-in-out group-hover:scale-110"></div>
  </div>
</template>

<script setup lang="ts">
interface Persona {
  id: string;
  name: string;
  color: string;
}

defineProps<{
  persona: Persona;
}>();

defineEmits(['select']);
</script>

<style scoped>
.x-mask {
  background-color: white;
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
}
</style>
