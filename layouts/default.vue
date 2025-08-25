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
          <NuxtLink to="/spark/personas" class="flex items-center space-x-3">
            <span
              class="font-bold text-xl hidden sm:inline"
              :style="{ color: primaryColor.value }"
            >
              {{ brandText }}
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
          <!-- Create Group -->
          <div class="">
            <ul class="space-y-1">
              <li>
                <NuxtLink
                  to="/spark/personas"
                  class="sidebar-link"
                  :class="{ active: route.path.startsWith('/spark/personas') }"
                  @mouseenter="(e) => showPopover(e, 'Create and manage AI personas with unique creative styles that you can use for various projects and collaborations.')"
                  @mouseleave="hidePopover"
                >
                  <span class="truncate">Sparks</span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/spark/projects"
                  class="sidebar-link"
                  :class="{ active: route.path.startsWith('/spark/projects') }"
                  @mouseenter="(e) => showPopover(e, 'Organize your creative work into projects and collaborate with AI personas to generate innovative content and ideas.')"
                  @mouseleave="hidePopover"
                >
                  <span class="truncate">Projects</span>
                </NuxtLink>
                
                <!-- Projects Submenu - Only show when projects is active -->
                <div v-if="route.path.startsWith('/spark/projects')" class="ml-4 mt-2 space-y-1">
                  <!-- Project List -->
                  <div v-if="isLoadingProjects" class="sidebar-link disabled">
                    <span class="truncate">Loading projects...</span>
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

          <!-- You Group -->
          <div class="mb-4 ">
            <ul class="space-y-1">
              <li>
                <NuxtLink
                  to="/training/my-spark"
                  class="sidebar-link"
                  :class="{ active: isMySparkActive }"
                  @mouseenter="(e) => showPopover(e, 'Access your personal creative AI model and explore your unique creativity patterns through interactive visualizations.')"
                  @mouseleave="hidePopover"
                >
                  <span class="truncate">My spark</span>
                </NuxtLink>
                
                <!-- Your Spark Submenu -->
                <div v-if="isMySparkActive" class="ml-4 mt-2 space-y-1">
                  <NuxtLink
                    :to="{ path: '/training/chat', query: { tab: 'chat' } }"
                    class="sidebar-link"
                    :class="{
                      active:
                        route.path === '/training/chat' &&
                        (route.query.tab === 'chat' || !route.query.tab),
                    }"
                    @mouseenter="(e) => showPopover(e, 'Train your personal AI model by providing examples and feedback to improve its understanding of your creative style.')"
                    @mouseleave="hidePopover"
                  >
                    <span class="truncate">Train</span>
                  </NuxtLink>
                  
                  <NuxtLink
                    to="/training/portfolio"
                    class="sidebar-link"
                    :class="{ active: route.path.startsWith('/training/portfolio') }"
                    @mouseenter="(e) => showPopover(e, 'Showcase your creative work and track your portfolio development over time.')"
                    @mouseleave="hidePopover"
                  >
                    <span class="truncate">My Portfolio</span>
                  </NuxtLink>
                  
                  <NuxtLink
                    :to="{ path: '/training/my-spark' }"
                    class="sidebar-link"
                    :class="{
                      active:
                        route.path === '/training/my-spark',
                    }"
                    @mouseenter="(e) => showPopover(e, 'View and interact with your personalized AI model that has learned from your creative patterns and preferences.')"
                    @mouseleave="hidePopover"
                  >
                    <span class="truncate">My model</span>
                  </NuxtLink>
                </div>
              </li>
              
              <!-- <li>
                <NuxtLink
                  :to="{ path: '/training/my-spark' }"
                  class="sidebar-link"
                  :class="{
                    active:
                      route.path === '/training/my-spark',
                  }"
                >
                  <span class="truncate">Creativity Map</span>
                </NuxtLink>
              </li> -->
            </ul>
          </div>


        </nav>

        <!-- Sidebar Footer Links -->
        <div class="border-t-4 border-primary-500">
          <NuxtLink
            to="/guide"
            class="sidebar-link"
            :class="{ active: route.path.startsWith('/guide') }"
            @mouseenter="(e) => showPopover(e, 'Learn how to use Art of X effectively with comprehensive guides for all features.')"
            @mouseleave="hidePopover"
          >
            <span class="truncate">Guide</span>
          </NuxtLink>
          
          <!-- Guide Submenu - Only show when guide is active -->
          <div v-if="route.path.startsWith('/guide')" class="ml-4 mt-2 space-y-1">
            <NuxtLink
              to="/guide"
              class="sidebar-link"
              :class="{ active: route.path === '/guide' }"
              @mouseenter="(e) => showPopover(e, 'Get started with Art of X - overview of all features and getting started guide.')"
              @mouseleave="hidePopover"
            >
              <span class="truncate">Overview</span>
            </NuxtLink>
            
            <NuxtLink
              to="/guide/sparks"
              class="sidebar-link"
              :class="{ active: route.path === '/guide/sparks' }"
              @mouseenter="(e) => showPopover(e, 'Learn how to use AI personas with unique creative styles for your projects.')"
              @mouseleave="hidePopover"
            >
              <span class="truncate">Sparks</span>
            </NuxtLink>
            
            <NuxtLink
              to="/guide/projects"
              class="sidebar-link"
              :class="{ active: route.path === '/guide/projects' }"
              @mouseenter="(e) => showPopover(e, 'Organize your creative work into projects and collaborate with AI personas.')"
              @mouseleave="hidePopover"
            >
              <span class="truncate">Projects</span>
            </NuxtLink>
            
            <NuxtLink
              to="/guide/my-spark"
              class="sidebar-link"
              :class="{ active: route.path === '/guide/my-spark' }"
              @mouseenter="(e) => showPopover(e, 'Understand and use your personal AI model that learns your creative style.')"
              @mouseleave="hidePopover"
            >
              <span class="truncate">My Spark</span>
            </NuxtLink>
            
            <NuxtLink
              to="/guide/training"
              class="sidebar-link"
              :class="{ active: route.path === '/guide/training' }"
              @mouseenter="(e) => showPopover(e, 'Train your AI to understand your unique creative style and preferences.')"
              @mouseleave="hidePopover"
            >
              <span class="truncate">Training</span>
            </NuxtLink>
            
            <NuxtLink
              to="/guide/portfolio"
              class="sidebar-link"
              :class="{ active: route.path === '/guide/portfolio' }"
              @mouseenter="(e) => showPopover(e, 'Showcase your creative work and track your portfolio development.')"
              @mouseleave="hidePopover"
            >
              <span class="truncate">Portfolio</span>
            </NuxtLink>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto bg-white dark:bg-secondary-900">
        <slot />
      </main>
    </div>

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
          <h3 class="text-3xl font-semibold mb-4 text-secondary-900 dark:text-white">
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
            <div>
              <label class="form-label">Add Sparks (up to {{ MAX_SPARKS }})</label>
              <div class="max-h-40 overflow-auto space-y-2 pr-1 border border-secondary-300 dark:border-secondary-600 rounded-md p-2">
                <label
                  v-for="spark in allSparks"
                  :key="spark.id"
                  class="flex items-start gap-3 p-2 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    class="form-checkbox mt-1"
                    :value="spark.id"
                    v-model="newProjectForm.selectedSparkIds"
                    :disabled="newProjectForm.selectedSparkIds.length >= MAX_SPARKS && !newProjectForm.selectedSparkIds.includes(spark.id)"
                  />
                  <div>
                    <div class="font-medium">{{ spark.name }}</div>
                    <div class=" text-sm  text-secondary-600 dark:text-secondary-300">{{ spark.discipline }}</div>
                    <div class="text-xs text-secondary-500 line-clamp-2">{{ spark.description }}</div>
                  </div>
                </label>
                <div v-if="allSparks.length === 0" class=" text-sm  text-secondary-500">No sparks available.</div>
              </div>
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

    <!-- Upgrade Modal (shared) -->
    <Modal
      v-model="isUpgradeModalOpen"
      title="Upgrade Required"
      max-width="md"
    >
      <div class="space-y-4">
        <div class="text-center">
          <div class="text-6xl mb-4">🚀</div>
          <h4 class="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
            {{ upgradeModalTitle }}
          </h4>
          <p class="text-secondary-600 dark:text-secondary-300">
            {{ upgradeModalMessage }}
          </p>
        </div>
        
        <div class="bg-secondary-50 dark:bg-secondary-800 rounded-lg p-4">
          <h5 class="font-semibold text-secondary-900 dark:text-white mb-2">Premium Benefits:</h5>
          <ul class="text-sm text-secondary-600 dark:text-secondary-300 space-y-1">
            <li>• Up to 10 projects (vs 3 on free plan)</li>
            <li>• Up to 8 sparks per project (vs 3 on free plan)</li>
            <li>• Priority support and advanced features</li>
          </ul>
        </div>
      </div>

      <template #actions>
        <button
          type="button"
          class="btn-secondary"
          @click="closeUpgradeModal()"
        >
          Maybe Later
        </button>
        <button
          type="button"
          class="btn-primary"
          :disabled="isUpgrading"
          @click="upgradeNow()"
        >
          <span v-if="isUpgrading" class="loading-spinner mr-2" />
          {{ isUpgrading ? "Redirecting..." : "Upgrade Now" }}
        </button>
      </template>
    </Modal>

    <!-- Global Popover -->
    <InfoPopover 
      ref="popoverRef"
      :description="popoverDescription"
      :triggerElement="popoverTrigger"
      position="right"
    />
  </div>
</template>

<script setup lang="ts">
import XAnimation from "~/components/XAnimation.vue";
import ProfileDropdown from "~/components/navigation/ProfileDropdown.vue";
import InfoPopover from "~/components/common/InfoPopover.vue";
import Modal from "~/components/common/Modal.vue";
import { useAuth } from "~/composables/useAuth";
import { useVersion } from "~/composables/useVersion";
import { useUserProfile } from "~/composables/useUserProfile";
import { useDynamicColors } from "~/composables/useDynamicColors";
import { primaryColor, secondaryColor } from "~/composables/useDynamicColors";
import { useHead } from "nuxt/app";
import { useUpgradeModal } from "~/composables/useUpgradeModal";
import { useRoute, useRouter, watch, ref, onMounted } from "#imports";
import { useSubscription } from '~/composables/useSubscription'

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
  selectedSparkIds: [] as string[],
});

const allSparks = ref<any[]>([]);
const { plan: userPlan, maxSparks, loaded: subscriptionLoaded, loadSubscription } = useSubscription()
const MAX_SPARKS = computed(() => maxSparks.value)

// Shared upgrade modal state
const { 
  isUpgradeModalOpen,
  isUpgrading,
  upgradeModalTitle,
  upgradeModalMessage,
  openUpgradeModal,
  closeUpgradeModal,
  upgradeNow,
} = useUpgradeModal();

// Popover state
const popoverRef = ref<InstanceType<typeof InfoPopover>>();
const popoverDescription = ref("");
const popoverTrigger = ref<HTMLElement | null>(null);

// Popover methods
function showPopover(event: MouseEvent, description: string) {
  const target = event.currentTarget as HTMLElement;
  popoverTrigger.value = target;
  popoverDescription.value = description;
  popoverRef.value?.show();
}

function hidePopover() {
  popoverRef.value?.hide();
}

onMounted(async () => {
  setColors();
  if (user.value) {
    await fetchProjects();
    await fetchAllSparks();
  }
  try { await loadSubscription() } catch {}
});

// Watch for user changes to refresh projects
watch(user, async (newUser) => {
  if (newUser) {
    await fetchProjects();
    await fetchAllSparks();
  } else {
    projects.value = [];
    allSparks.value = [];
  }
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

async function fetchAllSparks() {
  try {
    const response = await $fetch<{ data: any[] }>("/api/spark");
    allSparks.value = response.data;
  } catch (error) {
    console.error("Failed to fetch sparks:", error);
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
  // If subscription not yet loaded, allow creating and rely on server limits
  if (!subscriptionLoaded.value) {
    isCreateModalOpen.value = true;
    newProjectForm.selectedSparkIds = [] as string[];
    return;
  }
  const limit = userPlan.value === 'premium' ? 10 : 3
  if (projects.value.length >= limit) {
    openUpgradeModal({
      title: "Project Limit Reached",
      message: `You have reached the limit of ${limit} projects on your current plan. Upgrade to create more projects.`,
    })
    return;
  }
  isCreateModalOpen.value = true;
  newProjectForm.selectedSparkIds = []; // Reset selected sparks on open
}

function closeCreateModal() {
  isCreateModalOpen.value = false;
  newProjectForm.name = "";
  newProjectForm.task = "";
  newProjectForm.selectedSparkIds = [];
}

async function handleCreateProject() {
  if (isCreatingProject.value) return;
  
  isCreatingProject.value = true;
  try {
    // Enforce premium plan if any selected spark is premium
    if (newProjectForm.selectedSparkIds.length > 0 && userPlan.value !== 'premium') {
      const premiumIds = new Set(allSparks.value.filter((s: any) => s.isPremium).map((s: any) => s.id))
      const hasPremium = newProjectForm.selectedSparkIds.some((id: string) => premiumIds.has(id))
      if (hasPremium) {
        openUpgradeModal({
          title: 'Premium Spark',
          message: 'This project includes premium sparks. Upgrade to add premium sparks to projects.'
        })
        return;
      }
    }
    const response = await $fetch<{ data: any }>("/api/spark/projects", {
      method: "POST",
      body: { name: newProjectForm.name, task: newProjectForm.task, sparkIds: newProjectForm.selectedSparkIds },
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

const brandText = computed(() => {
  if (
    route.path.startsWith("/training/") &&
    user.value &&
    userProfile.value?.name &&
    !isLoadingProfile.value
  ) {
    return `Art of ${userProfile.value.name}`;
  }
  return "Art of X";
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

// Sidebar state helpers
const isMySparkActive = computed(() => (
  route.path.startsWith('/training/chat') ||
  route.path.startsWith('/training/portfolio') ||
  route.path.startsWith('/training/my-spark')
));
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
  @apply flex items-center gap-2 px-8 py-2  text-sm  rounded-md transition-colors;
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
  @apply block  text-sm  font-medium text-secondary-700 dark:text-secondary-300 mb-1;
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
