<template>
  <Chat :spark-id="sparkId" />
</template>

<script setup lang="ts">
import Chat from '~/components/Chat.vue';
const route = useRoute()
const sparkId = computed(() => (route.query.spark as string) || undefined)

definePageMeta({
  title: 'AI Chat'
})
</script> 