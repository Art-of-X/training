<script lang="ts" setup>

definePageMeta({
    layout: 'default',
});
</script>

<template>
  <div class="py-12">
    <ContentDoc class="legal-content" />
  </div>
</template>

<style>
.legal-content * {
  font-size: 1.125rem; /* text-lg */
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