<template>
  <div class="p-8 space-y-8">
    <!-- Project Selection -->
    <section class="border-b-4 border-primary-500">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-3xl font-bold">
          {{ selectedProject?.name || "Select a project" }}
        </h1>
      </div>
    </section>

    <template v-if="selectedProject">
      <!-- Sparks Section -->
      <section class="border-b-4 border-primary-500">
        <!-- Grid layout: Input (2 cols) + Sparks (3 cols) -->
        <div class="grid grid-cols-5 gap-4 mb-8">
          <!-- Input Column (2 cols) -->
                      <div class="col-span-2">
              <div class="bg-transparent dark:bg-transparent dark:text-white border-4 border-primary-500 rounded-lg h-full flex flex-col max-h-[500px]">
                <!-- Task input or run status display -->
                <div v-if="!isRunningTask" class="flex-1 flex flex-col p-6 overflow-hidden">
                  <!-- File badges at the top -->
                  <div class="flex flex-wrap gap-2 items-center mb-4">
                    <div
                      v-for="item in fileContextItems"
                      :key="item.id"
                      class="inline-flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium"
                    >
                      <span>{{ item.description || 'File' }}</span>
                      <button
                        class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        @click.stop="deleteContextItem(item.id)"
                        aria-label="Remove file"
                      >
                        <div class="x-mask-white w-3 h-3" aria-hidden="true"></div>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Textarea that grows to fill available space -->
                  <div class="flex-1 flex flex-col min-h-0">
                    <div class="relative flex-1">
                      <textarea
                        v-model="taskProxy"
                        @keydown.enter.exact.prevent="handleSendTask"
                        @keydown.enter.shift.exact="handleTaskShiftEnter"
                        placeholder="Describe your creative challenge. Agents will generate ideas and create monochrome paper collage covers."
                        class="w-full h-full min-h-[120px] bg-transparent dark:text-white resize-none text-base border-0 focus:outline-none focus:ring-0"
                        :disabled="isRunningTask"
                      ></textarea>
                      <div v-if="isTranscribing" class="pointer-events-none absolute bottom-3 right-3">
                        <span class="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Action toolbar always at the bottom -->
                  <div class="flex-shrink-0 mt-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <button
                          type="button"
                          @click="onRecordClick"
                          :disabled="isRunningTask"
                          :class="[actionButtonClass, isRecording ? 'bg-red-500 text-white' : '']"
                          aria-label="Record a voice memo"
                        >
                          <div :class="isRecording ? 'stop-icon-mask w-5 h-5' : 'record-icon-mask w-5 h-5'" aria-hidden="true"></div>
                          <span>{{ isRecording ? 'Stop' : 'Record' }}</span>
                        </button>
                        <button
                          type="button"
                          @click="addContextItem"
                          :disabled="isRunningTask"
                          :class="actionButtonClass"
                          aria-label="Upload a file"
                        >
                          <div class="upload-icon-mask w-5 h-5" aria-hidden="true"></div>
                          <span>Attach</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        :class="actionButtonClass"
                        :disabled="isRunningTask || !canSendTask"
                        @click="handleSendTask"
                        aria-label="Create Ideas"
                      >
                        <div class="send-icon-mask w-5 h-5" aria-hidden="true"></div>
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else class="w-full flex-1 flex flex-col p-6 overflow-hidden">
                  <!-- Multi-agent logs integrated into task area -->
                  <div class="border-t border-secondary-300 dark:border-secondary-600 pt-4 flex-1 flex flex-col overflow-hidden">
                  <!-- Task prompt display -->
                  <div class="text-sm text-secondary-600 dark:text-secondary-300 mb-2">
                    <span v-if="runStatus === 'running'"
                      >Agents creating individual proposals...</span
                    >
                    <span v-else-if="runStatus === 'coordinating'"
                      >Agents evaluating each other's proposals...</span
                    >
                    <span v-else-if="runStatus === 'saving'"
                      >Creating final outputs with artist-generated titles...</span
                    >
                    <span v-else-if="runStatus === 'finished'"
                      >Collaborative creation complete!</span
                    >
                    <span v-else-if="runStatus === 'error'"
                      >Run encountered an error.</span
                    >
                  </div>

                  <!-- Task prompt display -->
                  <div class="mb-3">
                    <div class="text-xs text-secondary-500 mb-1">Task:</div>
                    <div class="text-sm text-secondary-900 dark:text-white">
                      {{ task }}
                    </div>
                  </div>

                  <!-- Agent events log -->
                  <div v-if="agentEvents.length === 0" class="text-secondary-500 text-sm flex-1">
                    No messages yet.
                  </div>
                  <div
                    v-else
                    ref="logsContainer"
                    class="space-y-1 flex-1 overflow-y-auto"
                  >
                    <div
                      v-for="(evt, idx) in agentEvents"
                      :key="idx"
                      class="text-sm"
                    >
                      <div class="text-xs text-secondary-500 mb-1">
                        <strong>{{ evt.name || evt.type }}</strong>
                        <span class="ml-2 opacity-75">{{ evt.type }}</span>
                      </div>
                      <div v-if="evt.text" class="whitespace-pre-wrap text-secondary-700 dark:text-secondary-300">
                        {{ evt.text }}
                      </div>
                      <div v-if="evt.error" class="text-sm text-red-500">
                        {{ evt.error }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>



              <!-- Action buttons -->
              <div class="flex items-center justify-end">
                <button v-if="isRunningTask" class="btn-danger" @click="cancelTask">Cancel Run</button>
              </div>
            </div>
          </div>

          <!-- Sparks Grid (3 cols) -->
          <div class="col-span-3">
            <div class="grid grid-cols-3 gap-4">
              <div
                v-for="spark in assignedSparksLimited"
                :key="spark.id"
                class="group relative aspect-square w-full rounded-lg bg-secondary-100 dark:bg-secondary-800 overflow-hidden portfolio-tile"
              >
                <!-- Thinking status at top -->
                <div
                  v-if="runStatus !== 'idle'"
                  class="absolute top-2 left-2 text-[10px] sm:text-xs px-1 py-0.5 bg-secondary-700 dark:bg-secondary-600 text-white font-medium z-30 rounded-full"
                >
                  {{ agentThinking[spark.id] ? "thinking" : "done" }}
                </div>

                <!-- Remove button (visible on hover) -->
                <button
                  @click="handleRemoveSpark(spark.id)"
                  :disabled="isRunningTask || removingSparkId === spark.id"
                  class="absolute top-0 right-0 w-6 h-6 rounded-full bg-secondary-500 dark:bg-secondary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  :aria-label="isRunningTask ? 'Cannot remove spark during run' : removingSparkId === spark.id ? 'Removing...' : 'Remove spark'"
                  :title="isRunningTask ? 'Cannot remove spark during run' : removingSparkId === spark.id ? 'Removing...' : 'Remove spark'"
                >
                  <div v-if="removingSparkId === spark.id" class="loading-spinner w-4 h-4" />
                  <div v-else class="x-mask-primary w-4 h-4" aria-hidden="true"></div>
                  <!-- Disabled indicator -->
                  <div v-if="isRunningTask" class="absolute inset-0 bg-black/20 rounded-full"></div>
                </button>

                <!-- Media preview (SVG dendrogram) -->
                <template v-if="spark.dendrograms && spark.dendrograms.length > 0">
                  <div class="tile-media absolute inset-0 w-full h-full">
                    <div class="svg-container" v-html="spark.dendrograms[0].dendrogramSvg"></div>
                  </div>
                </template>
                
                <!-- Fallback cover -->
                <div v-else class="tile-media absolute inset-0 w-full h-full flex items-center justify-center">
                  <div class="text-center text-secondary-500 text-sm">
                    No dendrogram
                  </div>
                </div>

                <!-- Always-visible name bar -->
                <div class="absolute bottom-0 left-0 right-0 p-3 text-sm font-medium z-20 bg-primary-500" :style="{ color: secondaryColor }">
                  <div class="truncate w-full text-start">{{ spark.name }}</div>
                </div>
              </div>

              <!-- Add Sparks placeholder -->
              <div
                v-if="assignedSparksLimited.length < MAX_SPARKS"
                @click="openSelectSparks"
                class="group relative aspect-square w-full rounded-lg border-2 border-dashed border-secondary-300 dark:border-secondary-600 bg-transparent hover:bg-secondary-50 dark:hover:bg-secondary-700/30 cursor-pointer transition-colors duration-200 flex flex-col items-center justify-center"
              >
                <div class="text-secondary-400 dark:text-secondary-500 text-4xl mb-2">+</div>
                <div class="text-secondary-600 dark:text-secondary-400 text-sm font-medium text-center">
                  Add Sparks
                </div>
                <div class="text-secondary-500 dark:text-secondary-500 text-xs text-center mt-1">
                  {{ MAX_SPARKS - assignedSparksLimited.length }} slot{{ MAX_SPARKS - assignedSparksLimited.length !== 1 ? 's' : '' }} available
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Output Section -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-3xl font-bold">Artefacts</h1>
            <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
              {{ outputs.length }} idea{{ outputs.length !== 1 ? "s" : "" }} generated
            </p>
          </div>
          <button
            type="button"
            class="btn-danger"
            :disabled="isDeletingAllOutputs || outputs.length === 0"
            @click="deleteAllOutputs"
          >
            <span v-if="isDeletingAllOutputs" class="loading-spinner mr-2" />
            {{ isDeletingAllOutputs ? "Deleting..." : "Delete All" }}
          </button>
        </div>
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          <OutputCard
            v-for="output in outputs"
            :key="output.id"
            :output="output"
            @select="openOutputModal(output)"
            @image-generated="handleImageGenerated"
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
          class="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-lg"
        >
          <h3 class="text-lg font-semibold mb-4 text-secondary-900 dark:text-white">
            Add Sparks to Project
          </h3>
          <div class="text-sm text-secondary-600 dark:text-secondary-300 mb-2">
            You can add up to {{ MAX_SPARKS }} sparks. Available slots:
            {{ availableSparkSlots }}
          </div>
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
                :disabled="isCheckboxDisabled(spark.id)"
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
              :disabled="
                selectedToAssign.length === 0 ||
                isAssigningSparks ||
                selectedToAssign.length > availableSparkSlots
              "
              @click="handleAssignSelectedSparks"
            >
              <span v-if="isAssigningSparks" class="loading-spinner mr-2" />
              {{
                isAssigningSparks
                  ? "Adding..."
                  : `Add ${Math.min(selectedToAssign.length, availableSparkSlots)} Spark${
                      Math.min(selectedToAssign.length, availableSparkSlots) === 1
                        ? ""
                        : "s"
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
          class="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-lg"
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
      <div
        v-if="isOutputModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/50" @click="closeOutputModal" />
        <div
          class="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-lg"
        >
          <div class="flex items-start justify-between mb-3">
            <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Idea</h3>
            <button class="btn-secondary" @click="closeOutputModal">Close</button>
          </div>
          <div v-if="selectedOutput" class="space-y-4">
            <!-- Cover Image Display -->
            <div v-if="selectedOutput.coverImageUrl" class="w-full">
              <img
                :src="selectedOutput.coverImageUrl"
                :alt="selectedOutput.title"
                class="w-full h-48 object-cover rounded-lg border border-secondary-200 dark:border-secondary-700 filter grayscale"
              />
            </div>

            <div class="text-sm text-secondary-600 dark:text-secondary-200">
              <div class="font-medium mb-1">By: {{ selectedOutput.persona.name }}</div>
              <h3 class="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
                {{ selectedOutput.title }}
              </h3>
              <div
                class="markdown-content text-secondary-900 dark:text-white"
                v-html="renderedOutputText"
              ></div>
              <div
                v-if="selectedOutput.coverPrompt"
                class="mt-4 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700"
              >
                <h4 class="font-medium text-secondary-900 dark:text-white mb-2">
                  Cover Prompt:
                </h4>
                <p class="text-sm text-secondary-700 dark:text-secondary-300 italic">
                  {{ selectedOutput.coverPrompt }}
                </p>
                <button
                  v-if="!selectedOutput.coverImageUrl"
                  @click="generateCoverImageForModal"
                  :disabled="isGeneratingModalImage"
                  class="mt-2 bg-primary-500 hover:bg-primary-600 text-white text-sm px-4 py-2 rounded-lg transition flex items-center gap-2"
                >
                  <span
                    v-if="isGeneratingModalImage"
                    class="loading-spinner w-4 h-4"
                  ></span>
                  {{ isGeneratingModalImage ? "Creating..." : "Create Cover Image" }}
                </button>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button
                class="btn-danger"
                :disabled="isDeletingOutput"
                @click="deleteSelectedOutput"
              >
                <span v-if="isDeletingOutput" class="loading-spinner mr-2" />
                {{ isDeletingOutput ? "Deleting..." : "Delete" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch, watchEffect } from "vue";
import { nextTick } from "vue";
import { useRoute, navigateTo } from "#imports";
import SectionHeader from "~/components/common/SectionHeader.vue";
import OutputCard from "~/components/spark/OutputCard.vue";
import ItemGrid from "~/components/common/ItemGrid.vue";
import { secondaryColor } from "~/composables/useDynamicColors";
import { renderMarkdown } from "~/utils/markdown";
import type { Prisma } from "@prisma/client";
import { useChat } from "~/composables/useChat";

const route = useRoute();

// Event source for streaming (declared early to avoid initialization errors)
let currentEventSource: EventSource | null = null;

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
const removingSparkId = ref<string | null>(null);

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
const MAX_SPARKS = 5;
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

// Limit to six sparks for attachments
const assignedSparksLimited = computed(() => assignedSparks.value.slice(0, MAX_SPARKS));

// Map context files to small thumbnail items (if backend exposes thumbnailUrl or filePath)
type ContextItem = {
  id: string;
  description?: string;
  filePath?: string;
  thumbnailUrl?: string;
};
const fileContextItems = computed<ContextItem[]>(() => {
  const items = (selectedProject.value?.contextItems || []) as any[];
  return items
    .filter((i: any) => !!i.filePath)
    .map((i: any) => ({
      id: i.id,
      description: i.description,
      filePath: i.filePath,
      thumbnailUrl: i.thumbnailUrl || i.filePath,
    }));
});

function getSparkColor(id: string) {
  // simple deterministic color based on id
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const r = 100 + ((hash & 0xff) % 100);
  const g = 100 + (((hash >> 8) & 0xff) % 100);
  const b = 100 + (((hash >> 16) & 0xff) % 100);
  return `rgb(${r}, ${g}, ${b})`;
}

function getAgentThinkingDescription(sparkId: string): string {
  const spark = assignedSparksMap.value.get(sparkId);
  if (!spark) return "thinking...";

  // Generate diverse, discipline-specific thinking descriptions
  const thinkingActions = {
    Designer: [
      "sketching concepts",
      "exploring visual solutions",
      "crafting user experiences",
      "iterating on layouts",
      "studying design principles",
    ],
    Engineer: [
      "analyzing requirements",
      "designing system architecture",
      "optimizing algorithms",
      "debugging solutions",
      "planning implementation",
    ],
    Artist: [
      "exploring creative directions",
      "experimenting with mediums",
      "developing artistic vision",
      "crafting visual narratives",
      "refining techniques",
    ],
    Scientist: [
      "conducting research",
      "formulating hypotheses",
      "analyzing data patterns",
      "designing experiments",
      "synthesizing findings",
    ],
    Writer: [
      "crafting narratives",
      "developing characters",
      "structuring content",
      "refining language",
      "building worlds",
    ],
    Strategist: [
      "analyzing market trends",
      "evaluating opportunities",
      "planning approaches",
      "assessing risks",
      "optimizing outcomes",
    ],
    Educator: [
      "designing learning experiences",
      "adapting content",
      "assessing needs",
      "creating engagement",
      "facilitating understanding",
    ],
    Entrepreneur: [
      "identifying opportunities",
      "validating ideas",
      "planning ventures",
      "analyzing markets",
      "building strategies",
    ],
  };

  // Find the best matching discipline or use a default
  const discipline =
    Object.keys(thinkingActions).find((d) =>
      spark.discipline.toLowerCase().includes(d.toLowerCase())
    ) || "Creative";

  const actions = thinkingActions[discipline as keyof typeof thinkingActions] || [
    "brainstorming ideas",
    "exploring possibilities",
    "developing concepts",
    "refining approaches",
    "crafting solutions",
  ];

  // Use deterministic selection based on spark ID for consistency
  const hash = sparkId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const actionIndex = hash % actions.length;

  return actions[actionIndex];
}

function mapOutputForCard(o: any) {
  // Supports two shapes: with included spark (from project fetch) or minimal SSE payload
  const sparkId = o.spark?.id || o.sparkId;
  const sparkName = o.spark?.name || o.sparkName || "Spark";
  const color = sparkId ? getSparkColor(String(sparkId)) : "rgb(120,120,120)";
  return {
    id: o.id,
    title: o.title || "Untitled Idea",
    text: o.text,
    coverPrompt: o.coverPrompt,
    coverImageUrl: o.coverImageUrl,
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

// Recording and input toolbar logic (aligns with Chat.vue behavior)
const {
  isRecording,
  startRecording,
  stopRecording,
  transcriptDraft,
  isTranscribing,
} = useChat();

const actionButtonClass = computed(
  () =>
    "inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary-500 text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed space-x-2"
);

const taskProxy = computed({
  get: () => (transcriptDraft.value ? transcriptDraft.value : task.value),
  set: (val: string) => {
    if (transcriptDraft.value) transcriptDraft.value = val;
    else task.value = val;
  },
});

const canSendTask = computed(() => {
  const draft = transcriptDraft.value?.trim();
  const typed = task.value?.trim();
  return Boolean((draft && draft.length > 0) || (typed && typed.length > 0));
});

const onRecordClick = async () => {
  if (isRecording.value) {
    stopRecording();
  } else {
    await startRecording();
  }
};

const handleTaskShiftEnter = (e: Event) => {
  e.preventDefault();
  const textarea = e.target as HTMLTextAreaElement;
  const cursorPosition = textarea.selectionStart;
  const textBeforeCursor = textarea.value.substring(0, cursorPosition);
  const textAfterCursor = textarea.value.substring(cursorPosition);
  textarea.value = textBeforeCursor + "\n" + textAfterCursor;
  nextTick(() => {
    textarea.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
  });
};

async function handleSendTask() {
  if (isRunningTask.value) return;
  const draft = transcriptDraft.value?.trim();
  const typed = task.value?.trim();
  const content = draft && draft.length > 0 ? draft : typed;
  if (!content) return;
  if (draft && draft.length > 0) {
    task.value = draft; // persist transcribed text into task
    transcriptDraft.value = "";
  }
  await runTask();
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
    
    // Update URL to reflect selected project
    if (route.query.id !== selectedProjectId.value) {
      await navigateTo({
        path: '/spark/projects',
        query: { id: selectedProjectId.value }
      });
    }
  } catch (e: any) {
    error.value = e.data?.message || "Failed to fetch project details.";
    selectedProject.value = null;
  } finally {
    isLoading.value = false;
  }
}

async function handleCreateProject() {
  if (isCreatingProject.value) return;
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
    
    // Notify sidebar to refresh projects
    if (process.client) {
      window.dispatchEvent(new Event('project-changed'));
    }
    
    // Navigate to the new project
    await navigateTo({
      path: '/spark/projects',
      query: { id: response.data.id }
    });
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

const availableSparkSlots = computed(() =>
  Math.max(0, MAX_SPARKS - assignedSparks.value.length)
);

function isCheckboxDisabled(id: string) {
  if (assignedSparkIds.value.has(id)) return true;
  const selectedCount = selectedToAssign.value.includes(id)
    ? selectedToAssign.value.length
    : selectedToAssign.value.length + 1;
  return selectedCount > availableSparkSlots.value;
}

function openSelectSparks() {
  selectedToAssign.value = [];
  isSelectSparksOpen.value = true;
}

async function handleAssignSelectedSparks() {
  if (!selectedProjectId.value || selectedToAssign.value.length === 0) return;
  isAssigningSparks.value = true;
  try {
    const capacity = availableSparkSlots.value;
    const toAssign = selectedToAssign.value.slice(0, capacity);
    if (toAssign.length === 0) {
      alert(`This project already has ${MAX_SPARKS} sparks.`);
      return;
    }
    await Promise.all(
      toAssign.map((sparkId) =>
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
  if (isRunningTask.value) {
    alert("Cannot remove sparks while a task is running. Please wait for the current run to complete or cancel it first.");
    return;
  }
  const spark = assignedSparks.value.find((s) => s.id === sparkId);
  const label = spark ? `${spark.name} · ${spark.discipline}` : "this spark";
  if (!confirm(`Are you sure you want to remove ${label} from this project?`)) return;
  
  removingSparkId.value = sparkId;
  try {
    await $fetch(`/api/spark/projects/${selectedProjectId.value}/sparks`, {
      method: "DELETE",
      body: { sparkId },
    });
    await fetchProjectDetails();
  } catch (e: any) {
    error.value = e.data?.message || "Failed to remove spark.";
  } finally {
    removingSparkId.value = null;
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
    alert("Please provide a task before running.");
    return;
  }
  isRunningTask.value = true;
  runStatus.value = "running";
  agentEvents.value = [];

  // Keep previous outputs visible, new ones will be added to the list
  // outputs.value = []; // Removed this line to keep previous ideas visible

  // Reset thinking state for all assigned sparks
  agentThinking.value = {};
  assignedSparks.value.forEach((spark) => {
    agentThinking.value[spark.id] = true;
  });

  isMonologueOpen.value = true;

  // Ensure latest task is saved before run
  try {
    await $fetch(`/api/spark/projects/${selectedProjectId.value}`, {
      method: "PUT",
      body: { task: task.value },
    });
  } catch {}

  // Start run (async) then stream events by runId
  let runId: string | undefined;
  try {
    const start = await $fetch<{ runId: string }>(
      `/api/spark/projects/${selectedProjectId.value}/run.start`,
      { method: "POST" }
    );
    runId = start.runId;
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || "Failed to start run";
    isRunningTask.value = false;
    runStatus.value = "error";
    return;
  }

  if (currentEventSource) currentEventSource.close();
  const es = new EventSource(
    `/api/spark/projects/${selectedProjectId.value}/run.stream?runId=${runId}`
  );
  attachRunEventSource(es);
}

async function cancelTask() {
  if (!selectedProjectId.value) return;
  if (!confirm("Are you sure you want to cancel the current run? This cannot be undone."))
    return;

  try {
    // Call the cancel endpoint to stop the backend run
    await $fetch(`/api/spark/projects/${selectedProjectId.value}/run.cancel`, {
      method: "POST",
    });

    // Close the event source connection
    if (currentEventSource) {
      currentEventSource.close();
      currentEventSource = null;
    }

    // Reset all run-related state
    isRunningTask.value = false;
    runStatus.value = "idle";
    agentEvents.value = [];
    agentThinking.value = {};
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || "Failed to cancel run";
    console.error("Cancel run error:", e);
  }
}

onMounted(() => {
  fetchProjects();
});

// Watch for route query changes to sync selected project
watch(
  () => route.query.id,
  async (newId) => {
    if (newId && newId !== selectedProjectId.value) {
      selectedProjectId.value = newId as string;
      await fetchProjectDetails();
    }
  },
  { immediate: true }
);

watchEffect(async () => {
  // Auto-reconnect to active run when project changes
  if (!selectedProjectId.value) return;
  if (currentEventSource) return; // already connected
  try {
    const active = await $fetch<{ runId: string | null; status: string | null }>(
      `/api/spark/projects/${selectedProjectId.value}/run.active`
    );
    if (active.runId && active.status === "running") {
      runStatus.value = "running";
      isRunningTask.value = true;
      isMonologueOpen.value = true;

      // Initialize all assigned sparks as thinking when reconnecting to active run
      agentThinking.value = {};
      assignedSparks.value.forEach((spark) => {
        agentThinking.value[spark.id] = true;
      });

      const es = new EventSource(
        `/api/spark/projects/${selectedProjectId.value}/run.stream?runId=${active.runId}`
      );
      attachRunEventSource(es);
    }
  } catch {}
});

// UI state for monologue & streaming
type AgentEvent = {
  type: string;
  sparkId?: string;
  name?: string;
  text?: string;
  error?: string;
};
const agentEvents = ref<AgentEvent[]>([]);
const agentThinking = ref<Record<string, boolean>>({});
const isMonologueOpen = ref(true);
const runStatus = ref<
  "idle" | "running" | "coordinating" | "saving" | "finished" | "error"
>("idle");

// Auto-scroll functionality
const logsContainer = ref<HTMLElement | null>(null);

function scrollToBottom() {
  if (logsContainer.value) {
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
  }
}

function attachRunEventSource(es: EventSource) {
  currentEventSource = es;
  es.addEventListener("run:started", (e: MessageEvent) => {
    const data = JSON.parse(e.data || "{}");
    agentEvents.value.push({
      type: "run:started",
      name: "Run started",
      text: `Task: ${data.task}`,
    } as any);
    scrollToBottom();
  });
  es.addEventListener("agent:started", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    const spark = assignedSparksMap.value.get(d.sparkId);
    const action = spark ? getAgentThinkingDescription(d.sparkId) : "started ideation";
    agentEvents.value.push({
      type: "agent:started",
      name: d.name,
      text: `Started ${action}`,
    } as any);
    scrollToBottom();
  });

  es.addEventListener("agent:result", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({ type: "agent:result", name: d.name, text: d.text } as any);

    // Create early output placeholder when agent finishes ideation
    const earlyOutput = {
      id: `early-${d.sparkId}-${Date.now()}`,
      title: "Generating idea...",
      text: d.text,
      coverPrompt: null,
      coverImageUrl: null,
      persona: {
        id: d.sparkId,
        name: d.name || "Spark",
        color: getSparkColor(String(d.sparkId)),
      },
      status: "text-only", // Mark as text-only (no image yet)
    };
    outputs.value.unshift(earlyOutput);

    // Only limit new outputs from current run, preserve previous outputs
    const currentRunOutputs = outputs.value.filter(o => o.id.startsWith('early-'));
    if (currentRunOutputs.length > 3) {
      // Remove excess early outputs, keeping only the first 3
      const toRemove = currentRunOutputs.slice(3);
      outputs.value = outputs.value.filter(o => !toRemove.includes(o));
    }
    
    scrollToBottom();
  });

  es.addEventListener("outputs:saving", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({
      type: "outputs:saving",
      name: "System",
      text: `Crafting final outputs and generating visual covers...`,
    } as any);
    scrollToBottom();
  });

  es.addEventListener("output:created", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({
      type: "output:created",
      name: "System",
      text: `Output created by ${d.sparkName}`,
    } as any);

    // Find and replace the early output with the final one
    const earlyOutputIndex = outputs.value.findIndex(
      (o) => o.id.startsWith("early-") && o.persona.id === d.sparkId
    );

    const finalOutput = {
      id: d.id,
      title: d.title || "Untitled Idea",
      text: d.text,
      coverPrompt: d.coverPrompt,
      coverImageUrl: d.coverImageUrl,
      persona: {
        id: d.sparkId,
        name: d.sparkName || "Spark",
        color: getSparkColor(String(d.sparkId)),
      },
      status: d.coverImageUrl ? "complete" : "pending-image", // Mark status based on image availability
    };

    if (earlyOutputIndex !== -1) {
      // Replace early output with final one
      outputs.value[earlyOutputIndex] = finalOutput;
    } else {
      // Add new output if no early placeholder found
      outputs.value.unshift(finalOutput);
    }

    // Only limit new outputs from current run, preserve previous outputs
    const currentRunOutputs = outputs.value.filter(o => o.id.startsWith('early-') || o.status === 'pending-image' || o.status === 'complete');
    if (currentRunOutputs.length > 3) {
      // Remove excess outputs from current run, keeping only the first 3
      const toRemove = currentRunOutputs.slice(3);
      outputs.value = outputs.value.filter(o => !toRemove.includes(o));
    }
    
    scrollToBottom();
  });

  es.addEventListener("image:generating", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({
      type: "image:generating",
      name: "System",
      text: `Creating cover image...`,
    } as any);

    // Update output status to show image is being generated
    const outputIndex = outputs.value.findIndex((o) => o.id === d.outputId);
    if (outputIndex !== -1) {
      outputs.value[outputIndex].status = "pending-image";
    }
    
    scrollToBottom();
  });

  es.addEventListener("image:completed", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({
      type: "image:completed",
      name: "System",
      text: `Cover image completed!`,
    } as any);

    // Update output with completed image
    const outputIndex = outputs.value.findIndex((o) => o.id === d.outputId);
    if (outputIndex !== -1) {
      outputs.value[outputIndex].coverImageUrl = d.imageUrl;
      outputs.value[outputIndex].status = "complete";
    }
    
    scrollToBottom();
  });

  es.addEventListener("image:failed", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({
      type: "image:failed",
      name: "System",
      text: `Cover image generation failed: ${d.error}`,
    } as any);

    // Update output status to show image generation failed
    const outputIndex = outputs.value.findIndex((o) => o.id === d.outputId);
    if (outputIndex !== -1) {
      outputs.value[outputIndex].status = "complete"; // Mark as complete even without image
    }
    
    scrollToBottom();
  });
  es.addEventListener("agent:error", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({
      type: "agent:error",
      sparkId: d.sparkId,
      name: d.name,
      error: d.error,
    } as any);
    scrollToBottom();
  });
  es.addEventListener("agent:finished", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentThinking.value[d.sparkId] = false;
    const spark = assignedSparksMap.value.get(d.sparkId);
    const action = spark
      ? getAgentThinkingDescription(d.sparkId).replace("ing", "ed")
      : "finished ideation";
    agentEvents.value.push({
      type: "agent:finished",
      sparkId: d.sparkId,
      name: d.name,
      text: `Finished ${action}`,
    } as any);
    scrollToBottom();
  });
  es.addEventListener("coordination:started", () => {
    runStatus.value = "coordinating";
    agentEvents.value.push({
      type: "coordination:started",
      name: "Coordination",
      text: "Started synthesizing diverse perspectives",
    } as any);
    scrollToBottom();
  });
  es.addEventListener("coordination:result", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({
      type: "coordination:result",
      name: "Coordinator",
      text: `Synthesized insights: ${d.text.substring(0, 100)}${
        d.text.length > 100 ? "..." : ""
      }`,
    } as any);
    scrollToBottom();
  });
  es.addEventListener("coordination:error", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({
      type: "coordination:error",
      name: "Coordinator",
      error: d.error,
    } as any);
    scrollToBottom();
  });
  es.addEventListener("run:status", async (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    if (d.status === "finished") {
      runStatus.value = "finished";
      isRunningTask.value = false;
      es.close();
      currentEventSource = null;
      await fetchProjectDetails();
    } else if (d.status === "error") {
      runStatus.value = "error";
      isRunningTask.value = false;
      es.close();
      currentEventSource = null;
    } else if (d.status === "cancelled") {
      isRunningTask.value = false;
      runStatus.value = "idle";
      es.close();
      currentEventSource = null;
    }
  });
  es.onerror = () => {
    if (runStatus.value !== "finished") {
      runStatus.value = "error";
      isRunningTask.value = false;
      agentEvents.value.push({
        type: "connection:error",
        name: "System",
        text: "Connection error. Check authentication and server logs.",
      } as any);
      try {
        es.close();
      } catch {}
      currentEventSource = null;
    }
  };
}

// Output modal state
type UiOutput = {
  id: string;
  title: string;
  text: string;
  coverPrompt?: string;
  coverImageUrl?: string;
  persona: {
    id: string;
    name: string;
    color: string;
  };
  status?: "text-only" | "pending-image" | "complete";
};
const isOutputModalOpen = ref(false);
const selectedOutput = ref<UiOutput | null>(null);
const isDeletingOutput = ref(false);
const isDeletingAllOutputs = ref(false);

const renderedOutputText = computed(() => {
  if (!selectedOutput.value) return "";
  return renderMarkdown(selectedOutput.value.text);
});

function openOutputModal(output: UiOutput) {
  selectedOutput.value = output;
  isOutputModalOpen.value = true;
}

function closeOutputModal() {
  isOutputModalOpen.value = false;
  selectedOutput.value = null;
}

async function deleteSelectedOutput() {
  if (!selectedOutput.value) return;
  if (!confirm("Delete this idea? This cannot be undone.")) return;
  isDeletingOutput.value = true;
  try {
    await $fetch(`/api/spark/outputs/${selectedOutput.value.id}`, { method: "DELETE" });
    outputs.value = outputs.value.filter((o) => o.id !== selectedOutput.value?.id);
    closeOutputModal();
    
    // Notify sidebar to refresh projects
    if (process.client) {
      window.dispatchEvent(new Event('project-changed'));
    }
  } catch (e: any) {
    alert(e.data?.message || "Failed to delete output");
  } finally {
    isDeletingOutput.value = false;
  }
}

async function deleteAllOutputs() {
  if (!selectedProjectId.value) return;
  if (outputs.value.length === 0) return;
  if (!confirm("Delete ALL outputs for this project? This cannot be undone.")) return;
  isDeletingAllOutputs.value = true;
  try {
    // Try bulk endpoint first
    await $fetch(`/api/spark/projects/${selectedProjectId.value}/outputs`, {
      method: "DELETE",
    });
    await fetchProjectDetails();
    
    // Notify sidebar to refresh projects
    if (process.client) {
      window.dispatchEvent(new Event('project-changed'));
    }
  } catch (e: any) {
    // Fallback: delete one-by-one if bulk endpoint is unavailable
    try {
      await Promise.allSettled(
        outputs.value.map((o) =>
          $fetch(`/api/spark/outputs/${o.id}`, { method: "DELETE" })
        )
      );
      await fetchProjectDetails();
      
      // Notify sidebar to refresh projects
      if (process.client) {
        window.dispatchEvent(new Event('project-changed'));
      }
    } catch (e2: any) {
      alert(e2?.data?.message || e2?.message || "Failed to delete all outputs");
    }
  } finally {
    isDeletingAllOutputs.value = false;
  }
}

function handleImageGenerated({
  outputId,
  imageUrl,
}: {
  outputId: string;
  imageUrl: string;
}) {
  const output = outputs.value.find((o) => o.id === outputId);
  if (output) {
    output.coverImageUrl = imageUrl;
  }
}

// New function for generating cover image in modal
const isGeneratingModalImage = ref(false);
async function generateCoverImageForModal() {
  if (!selectedOutput.value?.coverPrompt) return;

  isGeneratingModalImage.value = true;
  try {
    const response = await $fetch("/api/spark/generate-cover-image", {
      method: "POST",
      body: {
        coverPrompt: selectedOutput.value.coverPrompt,
        outputId: selectedOutput.value.id,
      },
    });

    if (response.success) {
      selectedOutput.value.coverImageUrl = response.imageUrl;
      // Also update the output in the main outputs array
      const output = outputs.value.find((o) => o.id === selectedOutput.value?.id);
      if (output) {
        output.coverImageUrl = response.imageUrl;
      }
    }
  } catch (error: any) {
    console.error("Failed to generate cover image:", error);
    alert(error.data?.message || "Failed to generate cover image");
  } finally {
    isGeneratingModalImage.value = false;
  }
}
</script>

<style scoped>
.send-icon-mask {
  background-color: currentColor;
  -webkit-mask: url("/svg/icons/Send.svg") center / contain no-repeat;
  mask: url("/svg/icons/Send.svg") center / contain no-repeat;
}

.upload-icon-mask {
  background-color: currentColor;
  -webkit-mask: url("/svg/icons/Upload.svg") center / contain no-repeat;
  mask: url("/svg/icons/Upload.svg") center / contain no-repeat;
}
.record-icon-mask {
  background-color: white;
  -webkit-mask: url("/svg/icons/Record.svg") center / contain no-repeat;
  mask: url("/svg/icons/Record.svg") center / contain no-repeat;
}
.stop-icon-mask {
  background-color: white;
  -webkit-mask: url("/svg/icons/Stop.svg") center / contain no-repeat;
  mask: url("/svg/icons/Stop.svg") center / contain no-repeat;
}
.add-mask {
  background-color: currentColor;
  -webkit-mask: url("/svg/icons/Add.svg") center / contain no-repeat;
  mask: url("/svg/icons/Add.svg") center / contain no-repeat;
}
.x-mask-secondary {
  background-color: var(--header-nav-active-color);
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
}

.x-mask-white {
  background-color: white;
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
}

.x-mask-primary {
  background-color: hsl(var(--color-primary-500));
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
}

/* Portfolio tile styling - exact same as SparkGrid.vue */
.portfolio-tile { position: relative; }
.portfolio-tile { position: relative; aspect-ratio: 1 / 1; }
.portfolio-tile .tile-media { position: absolute; z-index: 0; transition: opacity 150ms ease-out; width: 100%; height: 100%; }
.portfolio-tile:hover { background-color: hsl(var(--color-primary-500)); }
/* Keep dendrogram visible on hover */
.portfolio-tile:hover .tile-media { opacity: 1; pointer-events: auto; }
.tile-title { opacity: 0; pointer-events: none; }
.portfolio-tile:hover .tile-title { opacity: 1; color: var(--header-nav-active-color); }

/* Remove button disabled state */
.portfolio-tile button:disabled {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
}

/* Ensure inline SVGs (if used) maintain aspect ratio */
.portfolio-tile .tile-media svg {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain;
  display: block;
}

/* Ensure injected SVG paths use the secondary color for fill and stroke */
.svg-container :deep(svg) {
  width: 100% !important;
  height: 100% !important;
}
/* Use CSS variables for dynamic secondary color so it works in scoped styles */
:root {
  --spark-secondary: #888;
}
.svg-container {
  --spark-secondary: v-bind(secondaryColor);
}
.svg-container :deep(svg [fill]) {
  fill: var(--spark-secondary) !important;
}
.svg-container :deep(svg [stroke]) {
  stroke: var(--spark-secondary) !important;
}
/* Override class-based styles defined inside the injected SVG */
.svg-container :deep(svg .link) {
  stroke: var(--spark-secondary) !important;
}
.svg-container :deep(svg .spark-node),
.svg-container :deep(svg .method-node),
.svg-container :deep(svg .competency-node) {
  fill: var(--spark-secondary) !important;
  stroke: var(--spark-secondary) !important;
}
.svg-container :deep(svg .node) {
  fill: var(--spark-secondary) !important;
  stroke: var(--spark-secondary) !important;
}

/* On hover, tile background turns primary, dendrogram remains visible due to tile-media opacity=1 above */

/* Markdown content styling for output modal */
.markdown-content :deep(h1) {
  @apply text-lg font-semibold mt-3 mb-2 text-secondary-900 dark:text-white;
}

.markdown-content :deep(h2) {
  @apply text-base font-semibold mt-3 mb-2 text-secondary-900 dark:text-white;
}

.markdown-content :deep(h3) {
  @apply text-sm font-semibold mt-2 mb-1 text-secondary-900 dark:text-white;
}

.markdown-content :deep(p) {
  @apply my-1.5 text-secondary-700 dark:text-secondary-300 text-base;
}

.markdown-content :deep(strong) {
  @apply font-semibold text-secondary-900 dark:text-white;
}

.markdown-content :deep(em) {
  @apply italic text-secondary-800 dark:text-secondary-200;
}

.markdown-content :deep(code) {
  @apply bg-secondary-100 dark:bg-secondary-800 px-1.5 py-0.5 rounded text-sm font-mono text-secondary-800 dark:text-secondary-200;
}

.markdown-content :deep(pre) {
  @apply bg-secondary-100 dark:bg-secondary-800 p-2 rounded-lg overflow-x-auto my-2 border border-secondary-200 dark:border-secondary-700;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  @apply ml-4 my-1.5 space-y-0.5;
}

.markdown-content :deep(li) {
  @apply my-0.5 text-secondary-700 dark:text-secondary-300;
}

.markdown-content :deep(a) {
  @apply text-blue-600 dark:text-blue-400 hover:underline;
}

.markdown-content :deep(blockquote) {
  @apply border-l-4 border-secondary-300 dark:border-secondary-600 pl-3 my-2 italic text-secondary-600 dark:text-secondary-400;
}
</style>
