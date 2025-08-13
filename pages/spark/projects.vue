<template>
  <div class="p-8 space-y-8">
    <!-- Project Selection -->
    <section class="border-b-4 border-primary-500">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-3xl font-bold">
          {{ selectedProject?.name || "Select a project" }}
        </h1>
        <div class="flex items-center space-x-4">
          <select
            v-model="selectedProjectId"
            @change="fetchProjectDetails"
            class="form-select"
          >
            <option disabled value="">Select a project</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
          <button @click="isCreateModalOpen = true" class="btn-primary">
            New Project
          </button>
        </div>
      </div>
    </section>

    <template v-if="selectedProject">
      <!-- Context Section -->
      <section class="border-b-4 border-primary-500">
        <!-- <SectionHeader title="Context" :has-add="false" /> -->
        <ItemGrid
          :items="selectedProject.contextItems"
          :show-add="true"
          :always-show-label="true"
          add-label="Add Files"
          @add="addContextItem"
          @delete="deleteContextItem"
        />
      </section>

      <!-- Sparks Section -->
      <section class="border-b-4 border-primary-500">
        <!-- <SectionHeader title="Sparks" :has-add="false" /> -->
        <!-- Task input sits above the grid to avoid consuming a grid column -->
        <div class="mb-4">
          <h3 class="font-bold mb-4 text-secondary-900 dark:text-white">Task</h3>
          <div class="bg-transparent dark:bg-transparent dark:text-white border-4 border-primary-500 rounded-lg">
            <textarea
              v-model="task"
              placeholder="Look at the briefings and ideate upon it"
              class="w-full min-h-24 bg-transparent dark:text-white resize-none text-base border-0 focus:outline-none focus:ring-0 p-4"
            ></textarea>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <button class="btn-secondary" :disabled="isSavingTask" @click="saveTask">
                  <span v-if="isSavingTask" class="loading-spinner mr-2" />
                  {{ isSavingTask ? "Saving..." : "Save" }}
                </button>
              </div>
              <button class="btn-primary" :disabled="isRunningTask" @click="runTask">
                <span v-if="isRunningTask" class="loading-spinner mr-2" />
                {{ isRunningTask ? "Running..." : "Run" }}
              </button>
            </div>
          </div>
        </div>
        <!-- Assigned Sparks grid using shared ItemGrid layout -->
        <ItemGrid
          :items="assignedSparkItems"
          :show-add="true"
          :always-show-label="true"
          add-label="Add Sparks"
          @add="openSelectSparks"
          @delete="handleRemoveSpark"
        />
      </section>

      <!-- Agent Discussion (Monologue) Section -->
      <section class="border-b-4 border-primary-500">
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-2xl font-bold">Agent Discussion</h1>
          <button class="btn-secondary" @click="isMonologueOpen = !isMonologueOpen">
            {{ isMonologueOpen ? 'Hide' : 'Show' }}
          </button>
        </div>
        <div class="text-sm text-secondary-600 dark:text-secondary-300 mb-2">
          <span v-if="runStatus === 'running'">Agents ideating...</span>
          <span v-else-if="runStatus === 'coordinating'">Coordinating proposals...</span>
          <span v-else-if="runStatus === 'saving'">Saving outputs...</span>
          <span v-else-if="runStatus === 'finished'">Run finished.</span>
          <span v-else-if="runStatus === 'error'">Run encountered an error.</span>
          <span v-else>No active run.</span>
        </div>
        <div v-if="isMonologueOpen" class="bg-transparent dark:bg-transparent border-4 border-primary-500 rounded-lg p-4 space-y-3">
          <div v-if="Object.keys(agentThinking).length > 0" class="flex flex-wrap gap-2">
            <div v-for="(thinking, id) in agentThinking" :key="id" v-show="thinking" class="inline-flex items-center gap-2 px-2 py-1 rounded bg-secondary-100 dark:bg-secondary-700 text-xs">
              <span class="loading-spinner" />
              <span>{{ assignedSparksMap.get(id)?.name || 'Agent' }} is thinking...</span>
            </div>
          </div>
          <div v-if="agentEvents.length === 0" class="text-secondary-500 text-sm">No messages yet.</div>
          <div v-else class="space-y-2 max-h-80 overflow-auto pr-1">
            <div v-for="(evt, idx) in agentEvents" :key="idx" class="rounded border border-secondary-200 dark:border-secondary-700 p-2">
              <div class="text-xs mb-1 text-secondary-500">
                <strong>{{ evt.name || evt.type }}</strong>
                <span class="ml-2 opacity-75">{{ evt.type }}</span>
              </div>
              <div v-if="evt.text" class="whitespace-pre-wrap text-sm">{{ evt.text }}</div>
              <div v-if="evt.error" class="text-sm text-red-500">{{ evt.error }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Output Section -->
      <section>
        <h1 class="text-3xl font-bold">Outputs</h1>
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          <OutputCard 
            v-for="output in outputs" 
            :key="output.id" 
            :output="output" 
            @select="openOutputModal(output)"
          />
        </div>
      </section>
    </template>
    <div v-else class="text-center py-12 text-secondary-500">
      <p>Select a project to start, or create a new one.</p>
    </div>

    <!-- Create Project Modal -->
    <transition name="fade-transform">
      <div
        v-if="isCreateModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/50" @click="isCreateModalOpen = false" />
        <div
          class="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-6"
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
                @click="isCreateModalOpen = false"
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

    <!-- Select Existing Sparks Modal -->
    <transition name="fade-transform">
      <div
        v-if="isSelectSparksOpen"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/50" @click="isSelectSparksOpen = false" />
        <div
          class="relative w-full max-w-xl bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-6"
        >
          <h3 class="text-lg font-semibold mb-4 text-secondary-900 dark:text-white">
            Add Sparks to Project
          </h3>
          <div class="max-h-80 overflow-auto space-y-2 pr-1">
            <label
              v-for="spark in unassignedSparks"
              :key="spark.id"
              class="flex items-start gap-3 p-2 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 cursor-pointer"
            >
              <input
                type="checkbox"
                class="form-checkbox mt-1"
                :value="spark.id"
                v-model="selectedToAssign"
              />
              <div>
                <div class="font-medium">{{ spark.name }}</div>
                <div class="text-sm text-secondary-600 dark:text-secondary-300">
                  {{ spark.discipline }}
                </div>
                <div class="text-xs text-secondary-500 line-clamp-2">
                  {{ spark.description }}
                </div>
              </div>
            </label>
            <div v-if="unassignedSparks.length === 0" class="text-sm text-secondary-500">
              No more sparks to add.
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-4">
            <button
              type="button"
              class="btn-secondary"
              @click="isSelectSparksOpen = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn-primary"
              :disabled="selectedToAssign.length === 0 || isAssigningSparks"
              @click="handleAssignSelectedSparks"
            >
              <span v-if="isAssigningSparks" class="loading-spinner mr-2" />
              {{
                isAssigningSparks
                  ? "Adding..."
                  : `Add ${selectedToAssign.length} Spark${
                      selectedToAssign.length === 1 ? "" : "s"
                    }`
              }}
            </button>
          </div>
        </div>
      </div>
    </transition>
    <!-- Add Context Item Modal -->
    <transition name="fade-transform">
      <div
        v-if="isAddContextModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/50" @click="closeAddContextModal" />
        <div
          class="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-6"
        >
          <h3 class="text-lg font-semibold mb-4 text-secondary-900 dark:text-white">
            Add Context Item
          </h3>
          <form @submit.prevent="handleAddContextSubmit" class="space-y-4">
            <div class="flex gap-3">
              <label class="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="link"
                  v-model="addContextType"
                  class="form-radio"
                />
                <span class="text-sm">Link</span>
              </label>
              <label class="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="file"
                  v-model="addContextType"
                  class="form-radio"
                />
                <span class="text-sm">File</span>
              </label>
              <label class="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="text"
                  v-model="addContextType"
                  class="form-radio"
                />
                <span class="text-sm">Text</span>
              </label>
            </div>

            <div v-if="addContextType === 'link'">
              <label for="add-link-url" class="form-label">Link URL</label>
              <input
                id="add-link-url"
                v-model="addContextForm.url"
                type="url"
                placeholder="https://example.com"
                class="form-input w-full mt-1"
                required
              />
            </div>

            <div v-else-if="addContextType === 'file'">
              <label for="add-file" class="form-label">File (max 10MB)</label>
              <input
                id="add-file"
                type="file"
                class="form-input mt-1"
                @change="handleAddContextFileChange"
                required
              />
            </div>

            <div v-else>
              <label for="add-text" class="form-label">Text</label>
              <textarea
                id="add-text"
                v-model="addContextForm.text"
                class="form-input w-full mt-1"
                rows="3"
                required
              ></textarea>
            </div>

            <div>
              <label for="add-description" class="form-label">Description</label>
              <input
                id="add-description"
                v-model="addContextForm.description"
                type="text"
                class="form-input w-full mt-1"
                placeholder="Brief description"
                required
              />
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="btn-secondary" @click="closeAddContextModal">
                Cancel
              </button>
              <button type="submit" class="btn-primary" :disabled="isSavingContext">
                <span v-if="isSavingContext" class="loading-spinner mr-2" />
                {{ isSavingContext ? "Saving..." : "Add Item" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Output Detail Modal -->
    <transition name="fade-transform">
      <div v-if="isOutputModalOpen" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closeOutputModal" />
        <div class="relative w-full max-w-xl bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-6">
          <div class="flex items-start justify-between mb-3">
            <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Idea</h3>
            <button class="btn-secondary" @click="closeOutputModal">Close</button>
          </div>
          <div v-if="selectedOutput" class="space-y-4">
            <div class="text-sm text-secondary-600 dark:text-secondary-200">
              <div class="font-medium mb-1">By: {{ selectedOutput.persona.name }}</div>
              <pre class="whitespace-pre-wrap text-secondary-900 dark:text-white">{{ selectedOutput.text }}</pre>
            </div>
            <div class="flex justify-end gap-2">
              <button class="btn-danger" :disabled="isDeletingOutput" @click="deleteSelectedOutput">
                <span v-if="isDeletingOutput" class="loading-spinner mr-2" />
                {{ isDeletingOutput ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive, watchEffect } from "vue";
import SectionHeader from "~/components/common/SectionHeader.vue";
import OutputCard from "~/components/spark/OutputCard.vue";
import ItemGrid from "~/components/common/ItemGrid.vue";
import type { Prisma } from "@prisma/client";

type ProjectWithDetails = Prisma.ProjectGetPayload<{
  include: {
    contextItems: true;
    sparks: { include: { spark: true } };
    outputs: { include: { spark: true } };
  };
}>;

// Page State
const projects = ref<ProjectWithDetails[]>([]);
const selectedProjectId = ref<string | null>(null);
const selectedProject = ref<ProjectWithDetails | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Create Project Modal
const isCreateModalOpen = ref(false);
const isCreatingProject = ref(false);
const newProjectForm = reactive({
  name: "",
  task: "",
});

// Add Context Item Modal
const isAddContextModalOpen = ref(false);
const isSavingContext = ref(false);
const addContextType = ref<"link" | "file" | "text">("link");
const addContextForm = reactive({
  description: "",
  url: "",
  file: null as File | null,
  text: "",
});

// Removed create spark flow (selection only)

// Real sparks
type SparkDendrogram = {
  id: string;
  dendrogramSvg: string;
  dendrogramPng?: string;
  updatedAt: string;
};

type Spark = { 
  id: string; 
  name: string; 
  description: string; 
  discipline: string;
  dendrograms: SparkDendrogram[];
};

const allSparks = ref<Spark[]>([]);
const task = ref("");
const outputs = ref<any[]>([]);
const isSavingTask = ref(false);
const isRunningTask = ref(false);
const assignedSparkIds = computed(
  () => new Set((selectedProject.value?.sparks || []).map((s) => s.sparkId))
);
const assignedSparks = computed(() => {
  const ids = assignedSparkIds.value;
  return allSparks.value.filter((s) => ids.has(s.id));
});

const assignedSparksMap = computed(() => {
  const m = new Map<string, Spark>();
  for (const s of assignedSparks.value) m.set(s.id, s);
  return m;
});

// Map sparks to ItemGrid item shape with dendrogram SVG as cover or placeholder
const assignedSparkItems = computed(() =>
  assignedSparks.value.map((s) => ({
    id: s.id,
    description: `${s.name} · ${s.discipline}`,
    filePath: s.dendrograms && s.dendrograms.length > 0 
      ? undefined 
      : "/svg/x.svg",
    hasDendrogram: s.dendrograms && s.dendrograms.length > 0,
    dendrogramSvg: s.dendrograms && s.dendrograms.length > 0 
      ? s.dendrograms[0].dendrogramSvg 
      : null,
  }))
);

function getSparkColor(id: string) {
  // simple deterministic color based on id
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const r = 100 + ((hash & 0xff) % 100);
  const g = 100 + (((hash >> 8) & 0xff) % 100);
  const b = 100 + (((hash >> 16) & 0xff) % 100);
  return `rgb(${r}, ${g}, ${b})`;
}

function mapOutputForCard(o: any) {
  // Supports two shapes: with included spark (from project fetch) or minimal SSE payload
  const sparkId = o.spark?.id || o.sparkId;
  const sparkName = o.spark?.name || o.sparkName || 'Spark';
  const color = sparkId ? getSparkColor(String(sparkId)) : 'rgb(120,120,120)';
  return {
    id: o.id,
    text: o.text,
    persona: { id: sparkId, name: sparkName, color },
  } as any;
}

// API Functions
async function fetchProjects() {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await $fetch<{ data: ProjectWithDetails[] }>("/api/spark/projects");
    projects.value = response.data;
    // load sparks once
    const s = await $fetch<{ data: Spark[] }>("/api/spark");
    allSparks.value = s.data;
    if (projects.value.length > 0) {
      selectedProjectId.value = projects.value[0].id;
      await fetchProjectDetails();
    }
  } catch (e: any) {
    error.value = e.data?.message || "Failed to fetch projects.";
  } finally {
    isLoading.value = false;
  }
}

async function fetchProjectDetails() {
  if (!selectedProjectId.value) {
    selectedProject.value = null;
    return;
  }
  isLoading.value = true;
  error.value = null;
  try {
    const response = await $fetch<{ data: ProjectWithDetails }>(
      `/api/spark/projects/${selectedProjectId.value}`
    );
    selectedProject.value = response.data;
    // Sync task and outputs with fetched data
    task.value = selectedProject.value?.task || "";
    outputs.value = (selectedProject.value?.outputs || []).map(mapOutputForCard);
  } catch (e: any) {
    error.value = e.data?.message || "Failed to fetch project details.";
    selectedProject.value = null;
  } finally {
    isLoading.value = false;
  }
}

async function handleCreateProject() {
  isCreatingProject.value = true;
  error.value = null;
  try {
    const response = await $fetch<{ data: ProjectWithDetails }>("/api/spark/projects", {
      method: "POST",
      body: newProjectForm,
    });
    isCreateModalOpen.value = false;
    newProjectForm.name = "";
    newProjectForm.task = "";
    await fetchProjects();
    selectedProjectId.value = response.data.id;
    await fetchProjectDetails();
  } catch (e: any) {
    error.value = e.data?.message || "Failed to create project.";
  } finally {
    isCreatingProject.value = false;
  }
}

const addContextItem = () => {
  isAddContextModalOpen.value = true;
};

const closeAddContextModal = () => {
  isAddContextModalOpen.value = false;
  // Reset form
  addContextType.value = "link";
  addContextForm.description = "";
  addContextForm.url = "";
  addContextForm.file = null;
  addContextForm.text = "";
};

const handleAddContextFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    addContextForm.file = input.files[0];
  }
};

const handleAddContextSubmit = async () => {
  if (!selectedProjectId.value) return;

  isSavingContext.value = true;
  error.value = null;

  try {
    let body: any = {
      projectId: selectedProjectId.value,
      description: addContextForm.description,
    };

    if (addContextType.value === "link") {
      body.link = addContextForm.url;
    } else if (addContextType.value === "text") {
      body.text = addContextForm.text;
    } else if (addContextType.value === "file" && addContextForm.file) {
      const formData = new FormData();
      formData.append("file", addContextForm.file);
      const uploadResponse = await $fetch<{ url: string }>("/api/upload/temp", {
        method: "POST",
        body: formData,
      });
      body.filePath = uploadResponse.url;
    }

    await $fetch("/api/spark/context", {
      method: "POST",
      body,
    });

    await fetchProjectDetails();
    closeAddContextModal();
  } catch (e: any) {
    error.value = e.data?.message || "Failed to add context item.";
  } finally {
    isSavingContext.value = false;
  }
};

const deleteContextItem = async (id: string) => {
  if (!confirm("Are you sure you want to delete this item?")) return;

  error.value = null;
  try {
    await $fetch(`/api/spark/context/${id}`, {
      method: "DELETE",
    });
    await fetchProjectDetails();
  } catch (e: any) {
    error.value = e.data?.message || "Failed to delete item.";
  }
};

// removed create handlers

// Removed toggle assign logic; assignment happens only via modal selection

// Select existing sparks modal state/logic
const isSelectSparksOpen = ref(false);
const selectedToAssign = ref<string[]>([]);
const isAssigningSparks = ref(false);
const unassignedSparks = computed(() =>
  allSparks.value.filter((s) => !assignedSparkIds.value.has(s.id))
);

function openSelectSparks() {
  selectedToAssign.value = [];
  isSelectSparksOpen.value = true;
}

async function handleAssignSelectedSparks() {
  if (!selectedProjectId.value || selectedToAssign.value.length === 0) return;
  isAssigningSparks.value = true;
  try {
    await Promise.all(
      selectedToAssign.value.map((sparkId) =>
        $fetch(`/api/spark/projects/${selectedProjectId.value}/sparks`, {
          method: "POST",
          body: { sparkId },
        })
      )
    );
    await fetchProjectDetails();
    isSelectSparksOpen.value = false;
  } catch (e: any) {
    error.value = e.data?.message || "Failed to add sparks.";
  } finally {
    isAssigningSparks.value = false;
  }
}

async function handleRemoveSpark(sparkId: string) {
  if (!selectedProjectId.value) return;
  const spark = assignedSparks.value.find((s) => s.id === sparkId);
  const label = spark ? `${spark.name} · ${spark.discipline}` : "this spark";
  if (!confirm(`Are you sure you want to remove ${label} from this project?`)) return;
  try {
    await $fetch(`/api/spark/projects/${selectedProjectId.value}/sparks`, {
      method: "DELETE",
      body: { sparkId },
    });
    await fetchProjectDetails();
  } catch (e: any) {
    error.value = e.data?.message || "Failed to remove spark.";
  }
}

async function saveTask() {
  if (!selectedProjectId.value) return;
  isSavingTask.value = true;
  error.value = null;
  try {
    await $fetch(`/api/spark/projects/${selectedProjectId.value}`, {
      method: "PUT",
      body: { task: task.value },
    });
  } catch (e: any) {
    error.value = e.data?.message || "Failed to save task.";
  } finally {
    isSavingTask.value = false;
  }
}

async function runTask() {
  if (!selectedProjectId.value) return;
  if (!task.value || task.value.trim().length === 0) {
    alert('Please provide a task before running.');
    return;
  }
  isRunningTask.value = true;
  runStatus.value = 'running';
  agentEvents.value = [];
  agentThinking.value = {} as Record<string, boolean>;
  isMonologueOpen.value = true;

  // Ensure latest task is saved before run
  try {
    await $fetch(`/api/spark/projects/${selectedProjectId.value}`, { method: 'PUT', body: { task: task.value } });
  } catch {}

  // Start run (async) then stream events by runId
  let runId: string | undefined;
  try {
    const start = await $fetch<{ runId: string }>(`/api/spark/projects/${selectedProjectId.value}/run.start`, { method: 'POST' });
    runId = start.runId;
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to start run';
    isRunningTask.value = false;
    runStatus.value = 'error';
    return;
  }

  if (currentEventSource) currentEventSource.close();
  const es = new EventSource(`/api/spark/projects/${selectedProjectId.value}/run.stream?runId=${runId}`);
  attachRunEventSource(es);
}

onMounted(() => {
  fetchProjects();
});

watchEffect(async () => {
  // Auto-reconnect to active run when project changes
  if (!selectedProjectId.value) return;
  if (currentEventSource) return; // already connected
  try {
    const active = await $fetch<{ runId: string | null; status: string | null }>(`/api/spark/projects/${selectedProjectId.value}/run.active`);
    if (active.runId && active.status === 'running') {
      runStatus.value = 'running';
      isMonologueOpen.value = true;
      const es = new EventSource(`/api/spark/projects/${selectedProjectId.value}/run.stream?runId=${active.runId}`);
      attachRunEventSource(es);
    }
  } catch {}
});

// UI state for monologue & streaming
type AgentEvent = { type: string; sparkId?: string; name?: string; text?: string; error?: string }
const agentEvents = ref<AgentEvent[]>([])
const agentThinking = ref<Record<string, boolean>>({})
const isMonologueOpen = ref(true)
const runStatus = ref<'idle' | 'running' | 'coordinating' | 'saving' | 'finished' | 'error'>('idle')
let currentEventSource: EventSource | null = null

function attachRunEventSource(es: EventSource) {
  currentEventSource = es;
  es.addEventListener('run:started', (e: MessageEvent) => {
    const data = JSON.parse(e.data || '{}');
    agentEvents.value.push({ type: 'run:started', name: 'Run started', text: `Task: ${data.task}` } as any);
  });
  es.addEventListener('agent:started', (e: MessageEvent) => {
    const d = JSON.parse(e.data || '{}');
    agentThinking.value[d.sparkId] = true;
    agentEvents.value.push({ type: 'agent:started', sparkId: d.sparkId, name: d.name, text: 'Started ideation' } as any);
  });
  es.addEventListener('agent:result', (e: MessageEvent) => {
    const d = JSON.parse(e.data || '{}');
    agentEvents.value.push({ type: 'agent:result', sparkId: d.sparkId, name: d.name, text: d.text } as any);
  });
  es.addEventListener('agent:error', (e: MessageEvent) => {
    const d = JSON.parse(e.data || '{}');
    agentEvents.value.push({ type: 'agent:error', sparkId: d.sparkId, name: d.name, error: d.error } as any);
  });
  es.addEventListener('agent:finished', (e: MessageEvent) => {
    const d = JSON.parse(e.data || '{}');
    agentThinking.value[d.sparkId] = false;
    agentEvents.value.push({ type: 'agent:finished', sparkId: d.sparkId, name: d.name, text: 'Finished' } as any);
  });
  es.addEventListener('coordination:started', () => {
    runStatus.value = 'coordinating';
    agentEvents.value.push({ type: 'coordination:started', name: 'Coordination', text: 'Started consolidating proposals' } as any);
  });
  es.addEventListener('coordination:result', (e: MessageEvent) => {
    const d = JSON.parse(e.data || '{}');
    agentEvents.value.push({ type: 'coordination:result', name: 'Coordinator', text: d.text } as any);
  });
  es.addEventListener('coordination:error', (e: MessageEvent) => {
    const d = JSON.parse(e.data || '{}');
    agentEvents.value.push({ type: 'coordination:error', name: 'Coordinator', error: d.error } as any);
  });
  es.addEventListener('outputs:saving', () => {
    runStatus.value = 'saving';
    agentEvents.value.push({ type: 'outputs:saving', name: 'System', text: 'Saving outputs...' } as any);
  });
  es.addEventListener('output:created', (e: MessageEvent) => {
    const d = JSON.parse(e.data || '{}');
    agentEvents.value.push({ type: 'output:created', name: 'System', text: `Output created by ${d.sparkName}` } as any);
    outputs.value.unshift(mapOutputForCard(d));
  });
  es.addEventListener('outputs:saved', (e: MessageEvent) => {
    const d = JSON.parse(e.data || '{}');
    agentEvents.value.push({ type: 'outputs:saved', name: 'System', text: `Saved ${d.count} outputs` } as any);
  });
  es.addEventListener('run:status', async (e: MessageEvent) => {
    const d = JSON.parse(e.data || '{}');
    if (d.status === 'finished') {
      runStatus.value = 'finished';
      isRunningTask.value = false;
      es.close();
      currentEventSource = null;
      await fetchProjectDetails();
    } else if (d.status === 'error') {
      runStatus.value = 'error';
      isRunningTask.value = false;
      es.close();
      currentEventSource = null;
    }
  });
  es.onerror = () => {
    if (runStatus.value !== 'finished') {
      runStatus.value = 'error';
      isRunningTask.value = false;
      agentEvents.value.push({ type: 'connection:error', name: 'System', text: 'Connection error. Check authentication and server logs.' } as any);
      try { es.close(); } catch {}
      currentEventSource = null;
    }
  };
}

// Output modal state
type UiOutput = { id: string; text: string; persona: { id: string; name: string; color: string } }
const isOutputModalOpen = ref(false)
const selectedOutput = ref<UiOutput | null>(null)
const isDeletingOutput = ref(false)

function openOutputModal(output: UiOutput) {
  selectedOutput.value = output
  isOutputModalOpen.value = true
}

function closeOutputModal() {
  isOutputModalOpen.value = false
  selectedOutput.value = null
}

async function deleteSelectedOutput() {
  if (!selectedOutput.value) return
  if (!confirm('Delete this idea? This cannot be undone.')) return
  isDeletingOutput.value = true
  try {
    await $fetch(`/api/spark/outputs/${selectedOutput.value.id}`, { method: 'DELETE' })
    outputs.value = outputs.value.filter(o => o.id !== selectedOutput.value?.id)
    closeOutputModal()
  } catch (e: any) {
    alert(e.data?.message || 'Failed to delete output')
  } finally {
    isDeletingOutput.value = false
  }
}
</script>
