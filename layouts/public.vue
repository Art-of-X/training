<template>
  <div class="min-h-screen bg-white dark:bg-secondary-900">
    <!-- Header -->
    <header class="backdrop-blur-md sticky top-0 z-40 bg-white/50 dark:bg-secondary-800/50 border-b border-secondary-200/50 dark:border-secondary-700/50">
      <div class="px-8">
        <div class="flex justify-between items-center h-16 relative">
          <!-- Logo -->
          <NuxtLink to="/" class="flex items-center space-x-3">
            <span class="font-bold text-xl text-secondary-900 dark:text-white">
              Art<sup class="ml-1 text-base font-semibold">x</sup>
            </span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full ml-2 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
              BETA
            </span>
          </NuxtLink>

          <!-- Right Aligned Items -->
          <div class="flex items-center space-x-4">
            <NuxtLink 
              to="/login" 
              class="nav-link"
            >
              Sign In
            </NuxtLink>
            <NuxtLink 
              to="/register" 
              class="btn-primary-sm sm:btn-primary"
            >
              Get Started
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content with Sidebar -->
    <div class="flex flex-1 min-h-0">
      <!-- Sidebar for Legal Links -->
      <aside class="hidden md:flex flex-col backdrop-blur-md transition-all duration-200 ease-in-out w-64 bg-white/50 dark:bg-secondary-800/50 border-r border-secondary-200/50 dark:border-secondary-700/50">
        <nav class="flex-1 overflow-y-auto p-6">
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-secondary-900 dark:text-white uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul class="space-y-2">
              <li>
                <NuxtLink 
                  to="/legal/dataprivacy" 
                  class="sidebar-link"
                >
                  <span class="truncate">Data Policy</span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink 
                  to="/legal/terms" 
                  class="sidebar-link"
                >
                  <span class="truncate">Terms of Use</span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink 
                  to="/legal/imprint" 
                  class="sidebar-link"
                >
                  <span class="truncate">Imprint</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
// Public layout - no authentication required
</script>

<style>
:root {
  /* Header height: matches py-4 (1rem = 16px) + content height */
  --app-header-height: 80px;
}

body {
  /* Clean minimal background */
  @apply bg-white dark:bg-secondary-900;
}

.nav-link {
  @apply text-base font-medium transition-colors;
  color: var(--header-nav-color, rgb(100, 100, 100));
}

.nav-link:hover {
  color: var(--header-nav-hover-color, rgb(75, 85, 99));
}

.btn-primary-sm {
  @apply px-3 py-1.5 text-sm bg-primary-500 text-white font-medium rounded-md transition-colors;
  @apply hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}

.btn-primary {
  @apply px-4 py-2 bg-primary-500 text-white font-medium rounded-md transition-colors;
  @apply hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}

.sidebar-link {
  @apply flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors;
  color: var(--sidebar-link-color, rgb(75, 85, 99));
}

.sidebar-link:hover {
  background-color: var(--sidebar-link-hover-bg, rgb(243, 244, 246));
  color: var(--sidebar-link-hover-color, rgb(55, 65, 81));
}
</style>
