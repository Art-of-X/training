<script lang="ts" setup>

definePageMeta({
    layout: 'public',
});
</script>

<template>
  <main class="py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <ContentDoc class="legal-content" />
    </div>
  </main>
</template>

<style>
.legal-content * {
  font-size: 1.125rem; /*  text-sm  */
  line-height: 1.75rem; /* leading-7 */
}

.legal-content h1,
.legal-content h2,
.legal-content h3,
.legal-content h4,
.legal-content h5,
.legal-content h6 {
  font-weight: 700; /* bold */
  margin-top: 1.5em;
  margin-bottom: 1em;
}
</style>