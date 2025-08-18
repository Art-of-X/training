<template>
  <div class="relative" ref="userMenuRef">
    <button
      @click="toggleUserMenu"
      class="flex items-center space-x-2 focus:outline-none"
    >
      <div
        class="w-16 h-16 flex items-center justify-center font-bold text-sm"
        :style="accentFgBgStyle"
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
        :style="accentFgBgStyle"
        class="absolute right-0 w-56 bg-white dark:bg-secondary-800 z-50 ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <div class="py-1">
          <div class="px-4 py-3">
            <p
              class="text-sm font-medium truncate"
              :style="{ color: primaryColor.value }"
            >
              {{ userProfile?.name || "User" }}
            </p>
            <p
              class="text-sm truncate"
              :style="{ color: secondaryColor.value }"
            >
              {{ user.email }}
            </p>
          </div>
          <NuxtLink
            to="/training/settings"
            class="dropdown-item"
            :style="{ color: primaryColor.value }"
            @click="closeUserMenu"
          >
            Settings
          </NuxtLink>
          <NuxtLink
            to="/training/chat"
            class="dropdown-item"
            :style="{ color: primaryColor.value }"
            @click="closeUserMenu"
          >
            Training Dashboard
          </NuxtLink>
          
          <NuxtLink
            to="/training/mental-model"
            class="dropdown-item"
            :style="{ color: primaryColor.value }"
            @click="closeUserMenu"
          >
            Your Spark
          </NuxtLink>
          
          <NuxtLink
            to="/training/creativity-benchmarking"
            class="dropdown-item"
            :style="{ color: primaryColor.value }"
            @click="closeUserMenu"
          >
            Creativity Tests
          </NuxtLink>
          
          <button
            @click="handleSignOut"
            class="dropdown-item w-full text-left"
            :style="{ color: primaryColor.value }"
          >
            Sign Out
          </button>
          
          <div class="my-2"></div>
          
          <div class="flex flex-col space-y-1 px-4 pb-2">
            <template
              v-for="link in versionConfig?.footerLinks || []"
              :key="link.to"
            >
              <NuxtLink
                v-if="!link.external"
                :to="link.to"
                class="dropdown-item px-0 text-xs"
                :style="{ color: primaryColor.value }"
                @click="closeUserMenu"
              >
                {{ link.text }}
              </NuxtLink>
              <a
                v-else
                :href="link.to"
                class="dropdown-item px-0 text-xs"
                :style="{ color: primaryColor.value }"
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useVersion } from '~/composables/useVersion';
import { useUserProfile } from '~/composables/useUserProfile';
import { useDynamicColors } from '~/composables/useDynamicColors';
import { useRoute } from '#imports';

const { user, signOut } = useAuth();
const { versionConfig } = useVersion();
const { userProfile, isLoadingProfile } = useUserProfile();
const { primaryColor, secondaryColor } = useDynamicColors();
const route = useRoute();

// State
const isUserMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

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

const accentFgBgStyle = computed(() => ({
  backgroundColor: primaryColor.value,
  color: secondaryColor.value,
}));

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

// Close menu on route change
watch(
  () => route.fullPath,
  () => {
    closeUserMenu();
  }
);
</script>

<style scoped>
.dropdown-item {
  @apply block w-full px-4 py-2 text-sm text-left transition-colors;
  color: var(--dropdown-item-color);
}

.dropdown-item:hover {
  background-color: var(--dropdown-item-hover-bg);
  color: var(--dropdown-item-hover-color);
}
</style> 
