<template>
  <div class="bg-white dark:bg-secondary-900 min-h-screen">
    <header v-if="user" class="backdrop-blur-md sticky top-0 z-40 bg-white/50 dark:bg-secondary-800/50 border-b border-secondary-200/50 dark:border-secondary-700/50">
      <div class="px-8">
        <div class="flex justify-between items-center h-16 relative">
          <!-- Logo -->
          <NuxtLink to="/training/chat" class="flex items-center space-x-3">
            <span
              v-if="user && userProfile?.name && !isLoadingProfile"
              class="font-bold text-xl text-secondary-900 dark:text-white hidden sm:inline"
            >
              Art<sup class="ml-1 text-base font-semibold">{{ userProfile.name }}</sup>
            </span>
            <span
              v-else
              class="font-bold text-xl text-secondary-900 dark:text-white hidden sm:inline"
            >
              Art<sup class="ml-1 text-base font-semibold">x</sup>
            </span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full ml-2 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">BETA</span>
          </NuxtLink>
          <div class="flex items-center space-x-2 sm:space-x-4">
            <div class="flex items-center space-x-2 sm:space-x-4">
              <div class="relative" ref="userMenuRef">
                <button
                  @click="toggleUserMenu"
                  class="flex items-center space-x-2 focus:outline-none"
                >
                  <div
                    class="w-9 h-9 bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm rounded-full dark:bg-primary-800/50 dark:text-primary-200 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-secondary-800 ring-transparent group-hover:ring-primary-300 transition-shadow"
                  >
                    {{ userInitials }}
                  </div>
                </button>
                <transition
                  name="fade-transform"
                  enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95"
                  enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75"
                  leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95"
                >
                  <div
                    v-if="isUserMenuOpen"
                    class="absolute right-0 mt-2 w-56 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-md shadow-lg z-50 ring-1 ring-black ring-opacity-5 focus:outline-none"
                  >
                    <div class="py-1">
                      <div
                        class="px-4 py-3 border-b border-secondary-200 dark:border-secondary-600"
                      >
                        <p
                          class="text-sm font-medium text-secondary-900 dark:text-white truncate"
                        >
                          {{ userProfile?.name || "User" }}
                        </p>
                        <p
                          class="text-sm text-secondary-500 dark:text-secondary-400 truncate"
                        >
                          {{ user.email }}
                        </p>
                      </div>
                      <NuxtLink
                        to="/training/chat"
                        class="dropdown-item"
                        @click="closeUserMenu"
                      >
                        Training Dashboard
                      </NuxtLink>
                      <button
                        @click="handleSignOut"
                        class="dropdown-item w-full text-left"
                      >
                        Sign Out
                      </button>
                      <div class="border-t border-secondary-100 dark:border-secondary-700 my-2"></div>
                      <div class="flex flex-col space-y-1 px-4 pb-2">
                        <template v-for="link in versionConfig.footerLinks" :key="link.to">
                          <NuxtLink
                            v-if="!link.external"
                            :to="link.to"
                            class="dropdown-item px-0 text-xs"
                            @click="closeUserMenu"
                          >
                            {{ link.text }}
                          </NuxtLink>
                          <a
                            v-else
                            :href="link.to"
                            class="dropdown-item px-0 text-xs"
                            target="_blank"
                            rel="noopener noreferrer"
                            @click="closeUserMenu"
                          >
                            {{ link.text }}
                          </a>
                        </template>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
    <header v-else class="backdrop-blur-md sticky top-0 z-40 bg-white/50 dark:bg-secondary-800/50 border-b border-secondary-200/50 dark:border-secondary-700/50">
      <div class="px-8">
        <div class="flex justify-between items-center h-16 relative">
          <NuxtLink to="/" class="flex items-center space-x-3">
            <span class="font-bold text-xl text-secondary-900 dark:text-white">
              Art<sup class="text-base font-semibold">x</sup>
            </span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full ml-2 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
              BETA
            </span>
          </NuxtLink>
          <div class="flex items-center space-x-4">
            <NuxtLink to="/login" class="nav-link">Sign In</NuxtLink>
            <NuxtLink to="/register" class="btn-primary-sm sm:btn-primary">Get Started</NuxtLink>
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
      <main class="flex-1 overflow-y-auto p-8">
        <div class="prose dark:prose-invert max-w-4xl mx-auto">
          <slot />
        </div>
      </main>
    </div>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Footer from '~/components/Footer.vue';
import { useAuth } from '~/composables/useAuth';
import { useUserProfile } from '~/composables/useUserProfile';
import { useVersion } from '~/composables/useVersion';
import { ref, computed } from 'vue';

const { user, signOut } = useAuth();
const { userProfile, isLoadingProfile } = useUserProfile();
const { versionConfig } = useVersion();

const isUserMenuOpen = ref(false);
const userMenuRef = ref(null);

const userInitials = computed(() => {
  if (userProfile.value?.name) {
    return userProfile.value.name.charAt(0).toUpperCase();
  }
  if (user.value?.email) {
    return user.value.email.charAt(0).toUpperCase();
  }
  return 'U';
});

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value;
};

const closeUserMenu = () => {
  isUserMenuOpen.value = false;
};

const handleSignOut = async () => {
  closeUserMenu();
  await signOut();
};
</script>

<style>
:root {
  /* Header height: matches py-4 (1rem = 16px) + content height */
  --app-header-height: 80px;
}

.dropdown-item {
  @apply block px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-white transition-colors;
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