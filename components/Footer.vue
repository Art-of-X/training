<template>
  <div :style="`background-color: ${primaryColor};`" class="py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div :style="`color: ${secondaryColor};`" class="text-end flex md:flex-col col-span-2 py-6">
        <div class="mt-auto ms-auto text-xl">
          <p class="font-bold">art× - Art of X UG (haftungsbeschränkt)</p>
          <p>Goethestr. 59</p>
          <p>10625 Berlin</p>
          <p>HRB 266185 B</p>
          <NuxtLink to="/legal/imprint" :style="`color: ${secondaryColor}`">Imprint</NuxtLink>
          |
          <NuxtLink to="/legal/dataprivacy" :style="`color: ${secondaryColor}`">Data Privacy</NuxtLink>
          |
          <NuxtLink to="/legal/terms" :style="`color: ${secondaryColor}`">Terms of Service</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { primaryColor, secondaryColor } from '~/composables/useDynamicColors';
</script> 