<template>
  <div class="h-screen bg-transparent flex flex-col">
    <client-only v-if="!user">
      <XAnimation />
    </client-only>
    <!-- Header -->
    <header class="backdrop-blur-md sticky top-0 z-40" :style="headerStyle">
      <div class="ps-4">
        <div class="flex justify-between items-center h-16 relative">
          <!-- Logo -->
          <NuxtLink to="/training/dashboard" class="flex items-center space-x-3">
            <span
              class="font-bold text-xl hidden sm:inline"
              :style="{ color: primaryColor.value }"
            >
              Art<sup class="ml-1 text-base font-semibold">{{ brandSupText }}</sup>
            </span>
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-full ml-2"
              :style="accentFgBgStyle"
              >BETA</span
            >
          </NuxtLink>

          <!-- Right Aligned Items -->
          <div class="flex items-center space-x-2 sm:space-x-4">
            <!-- Authenticated User Nav -->
            <div v-if="user" class="flex items-center space-x-2 sm:space-x-4">
              <ProfileDropdown />
            </div>

            <!-- Guest Nav -->
            <nav v-else class="flex items-center space-x-4">
              <NuxtLink
                to="/login"
                class="nav-link"
                :class="{ active: route.path === '/login' }"
                >Sign In</NuxtLink
              >
              <NuxtLink
                to="/register"
                class="btn-primary-sm sm:btn-primary"
                :style="{
                  backgroundColor: primaryColor.value,
                  color: secondaryColor.value,
                }"
              >
                Get Started
              </NuxtLink>
            </nav>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content with Sidebar -->
    <div class="flex flex-1 min-h-0">
      <!-- Sidebar (authenticated only) -->
      <aside
        v-if="user"
        class="hidden md:flex flex-col backdrop-blur-md transition-all duration-200 ease-in-out w-64"
        :style="sidebarStyle"
      >
        <nav class="flex-1 overflow-y-auto">
          <!-- You Group -->
          <div class="mb-4 ">
            <ul class="space-y-1">
              <li>
                <NuxtLink
                  to="/training/portfolio"
                  class="sidebar-link"
                  :class="{ active: route.path.startsWith('/training/portfolio') }"
                  :style="
                    route.path.startsWith('/training/portfolio')
                      ? sidebarLinkActiveStyle
                      : sidebarLinkStyle
                  "
                >
                  <span class="truncate">Portfolio</span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  :to="{ path: '/training/dashboard', query: { tab: 'chat' } }"
                  class="sidebar-link"
                  :class="{
                    active:
                      route.path === '/training/dashboard' &&
                      (route.query.tab === 'chat' || !route.query.tab),
                  }"
                  :style="
                    route.path === '/training/dashboard' &&
                    (route.query.tab === 'chat' || !route.query.tab)
                      ? sidebarLinkActiveStyle
                      : sidebarLinkStyle
                  "
                >
                  <span class="truncate">Chat</span>
                </NuxtLink>
              </li>
              <!-- <li>
                <div
                  class="sidebar-link disabled"
                  :style="{ color: primaryColor.value }"
                  title="Peer Training (soon)"
                >
                  <span class="truncate">Peer Training (soon)</span>
                </div>
              </li>
              <li>
                <div
                  class="sidebar-link disabled"
                  :style="{ color: primaryColor.value }"
                  title="Observation (soon)"
                >
                  <span class="truncate">Observation (soon)</span>
                </div>
              </li> -->
              <li>
                <NuxtLink
                  :to="{ path: '/training/mental-model', query: { view: 'user' } }"
                  class="sidebar-link"
                  :class="{
                    active:
                      route.path === '/training/mental-model' &&
                      (!route.query.view || route.query.view === 'user'),
                  }"
                  :style="
                    route.path === '/training/mental-model' &&
                    (!route.query.view || route.query.view === 'user')
                      ? sidebarLinkActiveStyle
                      : sidebarLinkStyle
                  "
                >
                  <span class="truncate">Your model</span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  :to="{ path: '/training/mental-model', query: { view: 'all' } }"
                  class="sidebar-link"
                  :class="{
                    active:
                      route.path === '/training/mental-model' &&
                      route.query.view === 'all',
                  }"
                  :style="
                    route.path === '/training/mental-model' && route.query.view === 'all'
                      ? sidebarLinkActiveStyle
                      : sidebarLinkStyle
                  "
                >
                  <span class="truncate">Creativity Map</span>
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Create Group -->
          <div class="">
            <ul class="space-y-1">
              <li>
                <NuxtLink
                  to="/spark/personas"
                  class="sidebar-link"
                  :class="{ active: route.path.startsWith('/spark/personas') }"
                  :style="
                    route.path.startsWith('/spark/personas')
                      ? sidebarLinkActiveStyle
                      : sidebarLinkStyle
                  "
                >
                  <span class="truncate">Sparks</span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/spark/projects"
                  class="sidebar-link"
                  :class="{ active: route.path.startsWith('/spark/projects') }"
                  :style="
                    route.path.startsWith('/spark/projects')
                      ? sidebarLinkActiveStyle
                      : sidebarLinkStyle
                  "
                >
                  <span class="truncate">Projects</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto bg-white dark:bg-secondary-900">
        <slot />
      </main>
    </div>

    <!-- Footer -->
    <Footer />
  </div>
</template>

<script setup lang="ts">
import XAnimation from "~/components/XAnimation.vue";
import Footer from "~/components/Footer.vue";
import ProfileDropdown from "~/components/navigation/ProfileDropdown.vue";
import { useAuth } from "~/composables/useAuth";
import { useVersion } from "~/composables/useVersion";
import { useUserProfile } from "~/composables/useUserProfile";
import { useDynamicColors } from "~/composables/useDynamicColors";
import { primaryColor, secondaryColor } from "~/composables/useDynamicColors";
import { useHead } from "nuxt/app";
import { useRoute } from "#imports";

const { user } = useAuth();
const { versionConfig } = useVersion();
const { userProfile, isLoadingProfile } = useUserProfile();
const { setColors } = useDynamicColors();
const route = useRoute();

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

// Computed
const routeTitle = computed(() => (route.meta?.title as string) || "");

const brandSupText = computed(() => {
  if (user.value && userProfile.value?.name && !isLoadingProfile.value) {
    return userProfile.value.name;
  }
  return "x";
});

const sidebarStyle = computed(() => ({
  backgroundColor: secondaryColor.value,
}));

const headerStyle = computed(() => ({
  backgroundColor: secondaryColor.value,
}));

const sidebarLinkStyle = computed(() => ({
  color: primaryColor.value,
}));

const sidebarLinkActiveStyle = computed(() => ({
  backgroundColor: primaryColor.value,
  color: secondaryColor.value,
}));

const accentFgBgStyle = computed(() => ({
  backgroundColor: primaryColor.value,
  color: secondaryColor.value,
}));
</script>

<style>
body {
  @apply bg-white;
}

.nav-link {
  @apply text-base font-medium transition-colors;
  color: var(--header-nav-color, rgb(100, 100, 100));
}

.nav-link:hover {
  color: var(--header-nav-hover-color, rgb(75, 85, 99));
}

.nav-link.active {
  color: var(--header-nav-active-color, rgb(100, 100, 100));
  background-color: var(--header-nav-active-bg, rgb(200, 200, 200));
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
}

.sidebar-link {
  @apply flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors;
}

.sidebar-link.disabled {
  @apply cursor-not-allowed opacity-50 pointer-events-none;
}
</style> 
