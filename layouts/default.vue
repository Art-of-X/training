<template>
  <div class="h-screen bg-transparent flex flex-col">
    <client-only v-if="!user">
      <XAnimation />
    </client-only>
    <!-- Header -->
    <header class="backdrop-blur-md sticky top-0 z-40" :style="headerStyle">
      <div class="px-8">
        <div class="flex justify-between items-center h-16 relative">
          <!-- Logo -->
          <NuxtLink to="/training/chat" class="flex items-center space-x-3">
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
                  to="/training/mental-model"
                  class="sidebar-link"
                  :class="{ active: route.path.startsWith('/training/mental-model') }"
                >
                  <span class="truncate">Your Spark</span>
                </NuxtLink>
                
                <!-- Your Spark Submenu -->
                <div class="ml-4 mt-2 space-y-1">
                  <NuxtLink
                    to="/training/portfolio"
                    class="sidebar-link"
                    :class="{ active: route.path.startsWith('/training/portfolio') }"
                  >
                    <span class="truncate">Portfolio</span>
                  </NuxtLink>
                  
                  <NuxtLink
                    :to="{ path: '/training/chat', query: { tab: 'chat' } }"
                    class="sidebar-link"
                    :class="{
                      active:
                        route.path === '/training/chat' &&
                        (route.query.tab === 'chat' || !route.query.tab),
                    }"
                  >
                    <span class="truncate">Train</span>
                  </NuxtLink>
                  
                  <NuxtLink
                    :to="{ path: '/training/mental-model', query: { view: 'user' } }"
                    class="sidebar-link"
                    :class="{
                      active:
                        route.path === '/training/mental-model' &&
                        (!route.query.view || route.query.view === 'user'),
                    }"
                  >
                    <span class="truncate">Your model</span>
                  </NuxtLink>
                </div>
              </li>
              
              <!-- <li>
                <NuxtLink
                  :to="{ path: '/training/mental-model', query: { view: 'all' } }"
                  class="sidebar-link"
                  :class="{
                    active:
                      route.path === '/training/mental-model' &&
                      route.query.view === 'all',
                  }"
                >
                  <span class="truncate">Creativity Map</span>
                </NuxtLink>
              </li> -->
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
                >
                  <span class="truncate">Sparks</span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/spark/projects"
                  class="sidebar-link"
                  :class="{ active: route.path.startsWith('/spark/projects') }"
                >
                  <span class="truncate">Projects</span>
                </NuxtLink>
                
                <!-- Projects Submenu - Only show when projects is active -->
                <div v-if="route.path.startsWith('/spark/projects')" class="ml-4 mt-2 space-y-1">
                  <!-- Project List -->
                  <div v-if="isLoadingProjects" class="px-8 py-1.5">
                    <div class="text-xs text-secondary-500">Loading projects...</div>
                  </div>
                  
                  <div v-else-if="projects.length === 0" class="sidebar-link disabled">
                    <span class="truncate">No projects yet</span>
                  </div>
                  
                  <NuxtLink
                    v-else
                    v-for="project in projects"
                    :key="project.id"
                    :to="`/spark/projects?id=${project.id}`"
                    class="sidebar-link"
                    :class="{ 
                      'active': route.path === '/spark/projects' && route.query.id === project.id 
                    }"
                  >
                    <span class="truncate">{{ project.name }}</span>
                  </NuxtLink>
                  
                  <!-- New Project Button at bottom -->
                  <button
                    @click="openCreateProjectModal"
                    class="sidebar-link w-full mt-2"
                    :style="{
                      backgroundColor: primaryColor.value,
                      color: secondaryColor.value,
                    }"
                  >
                    <span class="truncate">+ New Project</span>
                  </button>
                </div>
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

    <!-- Create Project Modal -->
    <transition name="fade-transform">
      <div
        v-if="isCreateModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/50" @click="closeCreateModal" />
        <div
          class="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-lg"
        >
          <h3 class="text-lg font-semibold mb-4 text-secondary-900 dark:text-white">
            Create New Project
          </h3>
          <form @submit.prevent="handleCreateProject" class="space-y-4">
            <div>
              <label for="project-name" class="form-label">Project Name</label>
              <input
                id="project-name"
                v-model="newProjectForm.name"
                type="text"
                class="form-input w-full mt-1"
                required
              />
            </div>
            <div>
              <label for="project-task" class="form-label">Task</label>
              <textarea
                id="project-task"
                v-model="newProjectForm.task"
                class="form-input w-full mt-1"
                rows="3"
                required
              ></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                class="btn-secondary"
                @click="closeCreateModal"
              >
                Cancel
              </button>
              <button type="submit" class="btn-primary" :disabled="isCreatingProject">
                <span v-if="isCreatingProject" class="loading-spinner mr-2" />
                {{ isCreatingProject ? "Creating..." : "Create Project" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
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
import { useRoute, useRouter, watch, onUnmounted } from "#imports";

const { user } = useAuth();
const { versionConfig } = useVersion();
const { userProfile, isLoadingProfile } = useUserProfile();
const { setColors } = useDynamicColors();
const route = useRoute();
const router = useRouter();

// Projects state
const projects = ref<any[]>([]);
const isLoadingProjects = ref(false);
const isCreateModalOpen = ref(false);
const isCreatingProject = ref(false);
const newProjectForm = reactive({
  name: "",
  task: "",
});

onMounted(async () => {
  setColors();
  if (user.value) {
    await fetchProjects();
    // Set up auto-refresh every 30 seconds
    startAutoRefresh();
  }
});

// Watch for user changes to refresh projects
watch(user, async (newUser) => {
  if (newUser) {
    await fetchProjects();
    startAutoRefresh();
  } else {
    projects.value = [];
    stopAutoRefresh();
  }
});

// Auto-refresh functionality
let autoRefreshInterval: NodeJS.Timeout | null = null;

function startAutoRefresh() {
  stopAutoRefresh(); // Clear any existing interval
  autoRefreshInterval = setInterval(async () => {
    if (user.value) {
      await fetchProjects();
    }
  }, 30000); // Refresh every 30 seconds
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// Clean up interval on unmount
onUnmounted(() => {
  stopAutoRefresh();
});

// Fetch projects for sidebar
async function fetchProjects() {
  isLoadingProjects.value = true;
  try {
    const response = await $fetch<{ data: any[] }>("/api/spark/projects");
    projects.value = response.data;
  } catch (error) {
    console.error("Failed to fetch projects:", error);
  } finally {
    isLoadingProjects.value = false;
  }
}

// Listen for project changes from other components
if (process.client) {
  window.addEventListener('project-changed', () => {
    fetchProjects();
  });
}

// Create project modal functions
function openCreateProjectModal() {
  isCreateModalOpen.value = true;
}

function closeCreateModal() {
  isCreateModalOpen.value = false;
  newProjectForm.name = "";
  newProjectForm.task = "";
}

async function handleCreateProject() {
  if (isCreatingProject.value) return;
  
  isCreatingProject.value = true;
  try {
    const response = await $fetch<{ data: any }>("/api/spark/projects", {
      method: "POST",
      body: newProjectForm,
    });
    
    // Add new project to sidebar list
    projects.value.push(response.data);
    
    // Close modal and reset form
    closeCreateModal();
    
    // Navigate to the new project
    await router.push(`/spark/projects?id=${response.data.id}`);
  } catch (error: any) {
    console.error("Failed to create project:", error);
    alert(error.data?.message || "Failed to create project");
  } finally {
    isCreatingProject.value = false;
  }
}

const pageTitle = computed(() => {
  const supabaseUser = user.value as any;
  const displayName =
    userProfile.value?.name ||
    supabaseUser?.user_metadata?.display_name ||
    supabaseUser?.user_metadata?.name ||
    (supabaseUser?.email ? supabaseUser.email.split('@')[0] : '');
  return `Art of ${displayName || 'X'}`;
});

useHead(() => ({
  title: pageTitle.value,
  titleTemplate: () => pageTitle.value,
}));

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

const accentFgBgStyle = computed(() => ({
  backgroundColor: primaryColor.value,
  color: secondaryColor.value,
}));
</script>

<style>
:root {
  /* Header height: matches h-16 (4rem = 64px) */
  --app-header-height: 64px;
}

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
  @apply flex items-center gap-2 px-8 py-2 text-sm rounded-md transition-colors;
  color: var(--sidebar-link-color);
}

.sidebar-link:hover {
  background-color: var(--sidebar-link-hover-bg);
  color: var(--sidebar-link-hover-color);
}

.sidebar-link.active {
  background-color: var(--sidebar-link-active-bg);
  color: var(--sidebar-link-active-color);
}

.sidebar-link.disabled {
  @apply cursor-not-allowed opacity-50 pointer-events-none;
}

.sidebar-sub-link {
  @apply flex items-center gap-2 px-8 py-1.5 text-xs rounded-md transition-colors;
  color: var(--sidebar-link-color);
  opacity: 0.8;
}

.sidebar-sub-link:hover {
  background-color: var(--sidebar-link-hover-bg);
  color: var(--sidebar-link-hover-color);
  opacity: 1;
}

.sidebar-sub-link.active {
  background-color: var(--sidebar-link-active-bg);
  color: var(--sidebar-link-active-color);
  opacity: 1;
}



 

/* Form styles */
.form-label {
  @apply block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1;
}

.form-input {
  @apply w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm;
  @apply bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
}

.btn-primary {
  @apply px-4 py-2 bg-primary-500 text-white font-medium rounded-md transition-colors;
  @apply hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}

.btn-secondary {
  @apply px-4 py-2 bg-secondary-200 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 font-medium rounded-md transition-colors;
  @apply hover:bg-secondary-300 dark:hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2;
}

.loading-spinner {
  @apply inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin;
}
</style> 
