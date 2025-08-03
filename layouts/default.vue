<template>
  <div class="h-screen bg-transparent flex flex-col">
    <client-only v-if="!user">
      <XAnimation />
    </client-only>
    <!-- Header -->
    <header
      class="bg-white/50 dark:bg-secondary-800/50 backdrop-blur-md border-b border-secondary-200/50 dark:border-secondary-700/50 sticky top-0 z-40"
    >
      <div class="container-wide">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <NuxtLink to="/training/dashboard" class="flex items-center space-x-3">
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
            <span class="bg-primary-100 text-primary-800 text-xs font-semibold px-2 py-0.5 rounded-full dark:bg-primary-900 dark:text-primary-300 ml-2">BETA</span>
          </NuxtLink>

          <!-- Right Aligned Items -->
          <div class="flex items-center space-x-2 sm:space-x-4">
            <ThemeSwitcher />

            <!-- Authenticated User Nav -->
            <div v-if="user" class="flex items-center space-x-2 sm:space-x-4">
              <!-- User Menu -->
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
                        to="/training/dashboard"
                        class="dropdown-item"
                        @click="closeUserMenu"
                      >
                        Training Dashboard
                      </NuxtLink>
                      <NuxtLink
                        to="/training/mental-model"
                        class="dropdown-item"
                        @click="closeUserMenu"
                      >
                        Your Mental Model
                      </NuxtLink>
                      <button
                        @click="handleSignOut"
                        class="dropdown-item w-full text-left"
                      >
                        Sign Out
                      </button>
                      <div class="border-t border-secondary-100 dark:border-secondary-700 my-2"></div>
                      <div class="flex flex-col space-y-1 px-4 pb-2">
                        <template v-for="link in versionConfig?.footerLinks || []" :key="link.to">
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

            <!-- Guest Nav -->
            <nav v-else class="flex items-center space-x-4">
              <NuxtLink to="/login" class="nav-link">Sign In</NuxtLink>
              <NuxtLink to="/register" class="btn-primary-sm sm:btn-primary"
                >Get Started</NuxtLink
              >
            </nav>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow overflow-y-auto bg-white dark:bg-secondary-900">
      <slot />
    </main>

    <!-- Footer -->
    <Footer />
  </div>
</template>

<script setup lang="ts">
import XAnimation from "~/components/XAnimation.vue";
import ThemeSwitcher from "~/components/ThemeSwitcher.vue";
import Footer from '~/components/Footer.vue';
import { useAuth } from "~/composables/useAuth";
import { useVersion } from "~/composables/useVersion";
import { useUserProfile } from "~/composables/useUserProfile";
import { useDynamicColors } from "~/composables/useDynamicColors";
import { useHead } from "nuxt/app";

const { user, signOut } = useAuth();
const { versionConfig } = useVersion();
const { userProfile, isLoadingProfile } = useUserProfile();
const { setColors } = useDynamicColors();

onMounted(setColors);

const pageTitle = computed(() => {
  if (userProfile.value?.name) {
    return `Art of ${userProfile.value.name}`;
  }
  return "Artx";
});

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - ${pageTitle.value}` : pageTitle.value;
  },
});

// State
const isUserMenuOpen = ref(false);

// Computed
const userInitials = computed(() => {
  if (userProfile.value?.name) {
    return userProfile.value.name.charAt(0).toUpperCase();
  }
  if (user.value?.email) {
    return user.value.email.charAt(0).toUpperCase();
  }
  return "U";
});

// Methods
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

// Close menus on route change
watch(
  () => useRoute().path,
  () => {
    closeUserMenu();
  }
);
</script>

<style>
body {
  @apply bg-white text-secondary-900;
  @apply dark:bg-secondary-900 dark:text-secondary-100;
}

.nav-link {
  @apply text-base font-medium text-secondary-600 hover:text-secondary-900 dark:text-secondary-300 dark:hover:text-white transition-colors;
}

.nav-link.active {
  @apply text-primary-600 dark:text-primary-400;
}

.dropdown-item {
  @apply block w-full px-4 py-2 text-sm text-left text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors;
}
</style>
