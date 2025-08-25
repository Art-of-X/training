<template>
  <section class="border-b-4 border-primary-500 pb-4">
    <h1 class="text-3xl font-bold">
      Loading
      <span class="dots">
        <span class="dot">.</span>
        <span class="dot">.</span>
        <span class="dot">.</span>
      </span>
    </h1>
  </section>
</template>

<style scoped>
.dots {
  display: inline-block;
}

.dot {
  animation: blink 1.4s infinite both;
  opacity: 0;
}

.dot:nth-child(1) {
  animation-delay: 0s;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 80%, 100% {
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
}
</style>
