<template>
  <div class="h-[calc(100vh-var(--app-header-height))] pt-8 space-y-8 overflow-hidden">
    <div v-if="isLoading">
      <PageLoader class="mx-8" />
    </div>
    <div v-else>
      <!-- Project Selection Header -->
      <section class="sticky top-0 z-30 px-8 pb-4 border-b-4 border-primary-500 bg-white dark:bg-secondary-900">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold">
            {{ selectedProject?.name || "Select a project" }}
          </h1>
          <div class="text-sm font-medium text-secondary-700 dark:text-secondary-300">
            «Scroll horizontally to follow your progress»
          </div>
        </div>
      </section>

      <div v-if="selectedProject">
        <!-- Horizontal Layout Container -->
        <div class="flex gap-8 overflow-x-auto pb-4">
          <!-- Sparks Section -->
          <div class="flex-shrink-0 w-96 border-r-4 border-primary-500 ps-8">
            <div class="my-4">
              <h2 class="text-xl font-bold mb-2">Your dream team</h2>
              <p class="text-sm text-secondary-600 dark:text-secondary-300">
                {{ assignedSparksLimited.length }}/{{ MAX_SPARKS }} assigned
              </p>
            </div>
            <div class="space-y-2">
              <div
                v-for="spark in assignedSparksLimited"
                :key="spark.id"
                class="group relative w-full h-16 rounded-lg overflow-hidden flex items-center"
              >
                <!-- Thinking status at top -->
                <div
                  v-if="runStatus !== 'idle'"
                  class="absolute top-1 left-1 text-sm px-1 py-0.5 bg-secondary-700 dark:bg-secondary-600 text-white font-medium z-30 rounded-full"
                >
                  {{ agentThinking[spark.id] ? "thinking" : "done" }}
                </div>

                <!-- Remove button (visible on hover) -->
                <button
                  @click="handleRemoveSpark(spark.id)"
                  :disabled="isRunningTask || removingSparkId === spark.id"
                  class="absolute top-1 right-1 w-5 h-5 rounded-full bg-secondary-500 dark:bg-secondary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  :aria-label="
                    isRunningTask
                      ? 'Cannot remove spark during run'
                      : removingSparkId === spark.id
                      ? 'Removing...'
                      : 'Remove spark'
                  "
                  :title="
                    isRunningTask
                      ? 'Cannot remove spark during run'
                      : removingSparkId === spark.id
                      ? 'Removing...'
                      : 'Remove spark'
                  "
                >
                  <div v-if="removingSparkId === spark.id" class="loading-spinner w-4 h-4" />
                  <div v-else class="x-mask-primary w-4 h-4" aria-hidden="true"></div>
                  <!-- Disabled indicator -->
                  <div v-if="isRunningTask" class="absolute inset-0 bg-black/20 rounded-full"></div>
                </button>

                <!-- Combined icon and name section -->
                <div class="flex-1 h-full flex">
                  <!-- Square icon/gradient -->
                  <div class="flex-shrink-0 w-16 h-full" :style="{ background: spark.dendrograms && spark.dendrograms.dendrogramSvg ? primaryColor : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }">
                    <!-- SVG dendrogram overlay if available -->
                    <template v-if="spark.dendrograms && spark.dendrograms.dendrogramSvg">
                      <div class="svg-container p-0 m-0 w-full h-full" v-html="spark.dendrograms.dendrogramSvg"></div>
                    </template>
                  </div>

                  <!-- Name and discipline info with primary background -->
                  <div class="flex-1 flex flex-col justify-center px-3 bg-primary-500">
                                    <div class="font-medium text-sm truncate" :style="{ color: secondaryColor }">
                  {{ spark.name }}
                </div>
                <div class="text-sm truncate" :style="{ color: secondaryColor }">
                  {{ spark.discipline }}
                </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Add Sparks button in separate row -->
            <div class="mt-4">
              <div
                @click="handleAddSparksClick"
                class="group relative w-full h-16 rounded-lg border-l-2 border-t-2 border-b-2 border-dashed border-primary-500 bg-transparent hover:bg-secondary-50 dark:hover:bg-secondary-700/30 cursor-pointer transition-colors duration-200 flex items-center"
              >
                <!-- Combined icon and name section -->
                <div class="flex-1 h-full flex">
                  <!-- Square icon/gradient -->
                  <div class="flex-shrink-0 w-16 h-full flex items-center justify-center">
                    <div class="text-3xl font-bold" :style="{ color: primaryColor }">+</div>
                  </div>

                  <!-- Name and discipline info with primary background -->
                  <div class="flex-1 flex flex-col justify-center px-3 bg-primary-500">
                    <div class="font-medium text-sm truncate" :style="{ color: secondaryColor }">
                      Add Sparks
                    </div>
                    <div class="text-sm truncate" :style="{ color: secondaryColor }">
                      {{ assignedSparksLimited.length < MAX_SPARKS 
                        ? `${MAX_SPARKS - assignedSparksLimited.length} slot${MAX_SPARKS - assignedSparksLimited.length !== 1 ? "s" : ""} available`
                        : 'Upgrade to add more sparks'
                      }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Chat Section - Full Height -->
          <div class="flex-shrink-0 w-96 border-r-4 border-primary-500">
            <div class="my-4">
              <h2 class="text-xl font-bold mb-2">Your task</h2>
              <p class="text-sm text-secondary-600 dark:text-secondary-300">
                Describe your creative challenge.
              </p>
            </div>
            <div
              class="h-[500px] flex flex-col"
              :style="{ backgroundColor: primaryColor }"
            >
              <!-- Task input or run status display -->
              <div v-if="!isRunningTask" class="flex-1 flex flex-col p-6 overflow-hidden">
                <!-- File badges at the top -->
                <div class="flex flex-wrap gap-2 items-center mb-4">
                  <div
                    v-for="item in fileContextItems"
                    :key="item.id"
                    class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                    :style="{ backgroundColor: secondaryColor, color: primaryColor }"
                  >
                    <span>{{ item.description || "File" }}</span>
                    <button
                      class="inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors"
                      :style="{ backgroundColor: `${primaryColor}20`, '&:hover': { backgroundColor: `${primaryColor}30` } }"
                      @click.stop="deleteContextItem(item.id)"
                      aria-label="Remove file"
                    >
                      <div class="x-mask-primary w-3 h-3" aria-hidden="true"></div>
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
                      placeholder="Describe your creative challenge. Agents will generate ideas."
                      class="w-full h-full min-h-[120px] bg-transparent resize-none text-sm border-0 focus:outline-none focus:ring-0"
                      :style="{ color: secondaryColor }"
                      :disabled="isRunningTask"
                    ></textarea>
                    <div v-if="isTranscribing" class="pointer-events-none absolute bottom-3 right-3">
                      <span
                        class="inline-flex w-4 h-4 rounded-full border-2 border-secondary-100 border-t-transparent animate-spin"
                      ></span>
                    </div>
                  </div>
                </div>

                <!-- Action toolbar always at the bottom -->
                <div class="flex-shrink-0 mt-2 mb-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <button
                        type="button"
                        @click="onRecordClick"
                        :disabled="isRunningTask"
                        :class="[actionButtonClass, isRecording ? 'bg-red-500 text-white' : '']"
                        :style="isRecording ? {} : { backgroundColor: secondaryColor, color: primaryColor }"
                        aria-label="Record a voice memo"
                      >
                        <div
                          :class="isRecording ? 'stop-icon-mask w-5 h-5' : 'record-icon-mask w-5 h-5'"
                          :style="isRecording ? {} : { backgroundColor: primaryColor }"
                          aria-hidden="true"
                        ></div>
                        <span>{{ isRecording ? "Stop" : "Record" }}</span>
                      </button>
                      <button
                        type="button"
                        @click="addContextItem"
                        :disabled="isRunningTask"
                        :class="actionButtonClass"
                        :style="{ backgroundColor: secondaryColor, color: primaryColor }"
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
                      :style="{ backgroundColor: secondaryColor, color: primaryColor }"
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
                <div
                  class="border-t border-secondary-300 dark:border-secondary-600 pt-4 flex-1 flex flex-col overflow-hidden"
                  :style="{ color: secondaryColor }"
                >
                  <!-- Task prompt display -->
                  <div class="text-sm mb-2">
                    <span v-if="runStatus === 'running'">Agents creating individual proposals...</span>
                    <span v-else-if="runStatus === 'coordinating'">Agents evaluating each other's proposals...</span>
                    <span v-else-if="runStatus === 'saving'">Creating final outputs with artist-generated titles...</span>
                    <span v-else-if="runStatus === 'finished'">Collaborative creation complete!</span>
                    <span v-else-if="runStatus === 'error'">Run encountered an error.</span>
                  </div>

                  <!-- Task prompt display -->
                  <div class="mb-3">
                    <div class="text-sm mb-1">Task:</div>
                    <div class="text-sm">
                    {{ task }}
                  </div>
                  </div>

                  <!-- Agent events log -->
                  <div v-if="agentEvents.length === 0" class="text-sm flex-1">
                    No messages yet.
                  </div>
                  <div v-else ref="logsContainer" class="space-y-1 flex-1 overflow-y-auto">
                    <div v-for="(evt, idx) in agentEvents" :key="idx" class="text-sm">
                      <div class="text-sm mb-1">
                      <strong>{{ evt.name || evt.type }}</strong>
                      <span class="ml-2 opacity-75">{{ evt.type }}</span>
                    </div>
                      <div v-if="evt.text" class="whitespace-pre-wrap">
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
              <div class="flex items-center justify-end p-4">
                <button v-if="isRunningTask" class="btn-danger" @click="cancelTask">Cancel Run</button>
              </div>
            </div>
          </div>

          <!-- Ideation & Reflection Section -->
          <div class="flex-shrink-0 border-r-4 border-primary-500">
            <div class="my-4">
                              <div class="flex items-center gap-2">
                  <h2 class="text-xl font-bold">Ideation & Reflection</h2>
                  <button
                    type="button"
                    class="text-sm font-semibold px-2 py-0.5 rounded-full transition-colors"
                  :class="isDeletingAllOutputs || outputs.length === 0 ? 'bg-secondary-300 text-secondary-600 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'"
                  :disabled="isDeletingAllOutputs || outputs.length === 0"
                  @click="deleteAllOutputs"
                >
                  <span v-if="isDeletingAllOutputs" class="loading-spinner mr-1" />
                  {{ isDeletingAllOutputs ? "Deleting..." : "Remove All" }}
                </button>
              </div>
              <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-2">
                Insights and thought processes will appear here.
              </p>
            </div>
            <div class="grid grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
              <OutputCard
                v-for="output in outputs"
                :key="output.id"
                :output="output"
                class="w-48"
                @select="!isRunningTask && openOutputModal(output)"
              />
            </div>
          </div>

          <!-- Output Section -->
          <div class="flex-shrink-0 border-r-4 border-primary-500">
            <div class="my-4">
                              <div class="flex items-center gap-2">
                  <h2 class="text-xl font-bold">Artefacts</h2>
                  <span class="text-sm font-semibold px-2 py-0.5 rounded-full" :style="{ backgroundColor: primaryColor, color: secondaryColor }">
                    Soon
                  </span>
                </div>
              <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-2">
                Coming soon: Images, Videos, Copies, Misc
              </p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                            <div 
                class="group relative rounded-lg flex flex-col justify-between w-48 h-48 cursor-pointer transition overflow-hidden bg-primary-500 artefact-card"
                :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }"
              >
                <div class="w-full flex-1 flex items-center justify-center">
                  <div class="text-xl">🖼️</div>
                </div>
                <div class="p-3" :style="{ backgroundColor: primaryColor }">
                  <h4 class="font-bold mb-1 text-sm" :style="{ color: secondaryColor }">Images</h4>
                </div>
              </div>
              <div 
                class="group relative rounded-lg flex flex-col justify-between w-48 h-48 cursor-pointer transition overflow-hidden bg-primary-500 artefact-card"
                :style="{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})` }"
              >
                <div class="w-full flex-1 flex items-center justify-center">
                  <div class="text-xl">🎥</div>
                </div>
                <div class="p-3" :style="{ backgroundColor: primaryColor }">
                  <h4 class="font-bold mb-1 text-sm" :style="{ color: secondaryColor }">Videos</h4>
                </div>
              </div>
              <div 
                class="group relative rounded-lg flex flex-col justify-between w-48 h-48 cursor-pointer transition overflow-hidden bg-primary-500 artefact-card"
                :style="{ background: `linear-gradient(225deg, ${primaryColor}, ${secondaryColor})` }"
              >
                <div class="w-full flex-1 flex items-center justify-center">
                  <div class="text-xl">📄</div>
                </div>
                <div class="p-3" :style="{ backgroundColor: primaryColor }">
                  <h4 class="font-bold mb-1 text-sm" :style="{ color: secondaryColor }">Copies</h4>
                </div>
              </div>
              <div 
                class="group relative rounded-lg flex flex-col justify-between w-48 h-48 cursor-pointer transition overflow-hidden bg-primary-500 artefact-card"
                :style="{ background: `linear-gradient(315deg, ${primaryColor}, ${secondaryColor})` }"
              >
                <div class="w-full flex-1 flex items-center justify-center">
                  <div class="text-xl">📦</div>
                </div>
                <div class="p-3" :style="{ backgroundColor: primaryColor }">
                  <h4 class="font-bold mb-1 text-sm" :style="{ color: secondaryColor }">Misc</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-12 text-secondary-500">
        <p>Select a project to start, or create a new one.</p>
      </div>

      <!-- Create Project Modal -->
      <transition name="fade-transform">
        <div v-if="isCreateModalOpen" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="isCreateModalOpen = false" />
          <div class="relative w-full max-w-4xl bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-lg">
            <h3 class="text-3xl font-semibold mb-4 text-secondary-900 dark:text-white">Create New Project</h3>
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
                <button type="button" class="btn-secondary" @click="isCreateModalOpen = false">Cancel</button>
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
        <div v-if="isSelectSparksOpen" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="isSelectSparksOpen = false" />
          <div class="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-lg">
            <h3 class="text-3xl font-semibold mb-4 text-secondary-900 dark:text-white">Add Sparks to Project</h3>
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
                  <div class="text-sm text-secondary-500 line-clamp-2">
                    {{ spark.description }}
                  </div>
                </div>
              </label>
              <div v-if="unassignedSparks.length === 0" class="text-sm text-secondary-500">No more sparks to add.</div>
            </div>
            <div class="flex justify-end gap-2 pt-4">
              <button type="button" class="btn-secondary" @click="isSelectSparksOpen = false">Cancel</button>
              <button
                type="button"
                class="btn-primary"
                :disabled="
                  selectedToAssign.length === 0 || isAssigningSparks || selectedToAssign.length > availableSparkSlots
                "
                @click="handleAssignSelectedSparks"
              >
                <span v-if="isAssigningSparks" class="loading-spinner mr-2" />
                {{
                  isAssigningSparks
                    ? "Adding..."
                    : `Add ${Math.min(selectedToAssign.length, availableSparkSlots)} Spark${
                        Math.min(selectedToAssign.length, availableSparkSlots) === 1 ? "" : "s"
                      }`
                }}
              </button>
            </div>
          </div>
        </div>
      </transition>
      <!-- Add Context Item Modal -->
      <transition name="fade-transform">
        <div v-if="isAddContextModalOpen" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="closeAddContextModal" />
          <div class="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-lg">
            <h3 class="text-3xl font-semibold mb-4 text-secondary-900 dark:text-white">Add Context Item</h3>
            <form @submit.prevent="handleAddContextSubmit" class="space-y-4">
              <div class="flex gap-3">
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="link" v-model="addContextType" class="form-radio" />
                  <span class="text-sm">Link</span>
                </label>
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="file" v-model="addContextType" class="form-radio" />
                  <span class="text-sm">File</span>
                </label>
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="text" v-model="addContextType" class="form-radio" />
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
                <button type="button" class="btn-secondary" @click="closeAddContextModal">Cancel</button>
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
          <Modal
            v-model="isOutputModalOpen"
            :title="selectedOutput ? selectedOutput.title : 'Idea'"
            max-width="6xl"
            :body-class="'max-h-[80vh] overflow-hidden'"
            :close-on-backdrop="false"
          >
            <template #headerActions>
              <button class="btn-danger btn-sm" :disabled="isDeletingOutput" @click="deleteSelectedOutput">
                <span v-if="isDeletingOutput" class="loading-spinner mr-2" />
                {{ isDeletingOutput ? 'Deleting...' : 'Delete' }}
              </button>
            </template>
            <div v-if="selectedOutput" class="grid grid-cols-1 md:grid-cols-2 gap-4 h-[75vh]">
              <!-- Left fixed column -->
              <div class="flex flex-col h-full rounded-lg p-4" :style="{ backgroundColor: secondaryColor }">
                <div class="text-sm" :style="{ color: primaryColor }">
                   <div class="font-medium mb-1">By: {{ selectedOutput.persona.name }}</div>
                  <template v-if="!isUpdatingIdea">
                    <h3 class="text-base font-semibold mb-3" :style="{ color: primaryColor }">{{ selectedOutput.title }}</h3>
                  </template>
                  <template v-else>
                    <div class="animate-pulse h-5 bg-secondary-300/60 rounded w-3/5 mb-3"></div>
                  </template>
                </div>
                <div class="flex-1 overflow-y-auto pr-2">
                  <div class="markdown-content" :style="{ color: primaryColor }" v-html="renderedOutputText"></div>
                </div>
              </div>
              <!-- Right chat column: messages scroll, input fixed -->
              <div class="flex flex-col h-full min-h-0">
                <div class="flex-1 min-h-0 overflow-y-auto pr-1">
                  <Chat
                    embedded
                    :external-messages="refineChatWithGreeting"
                    @submit="(text:string)=>{ refineComment = text; refineSelectedOutput(); }"
                  />
                </div>
              </div>
            </div>
          </Modal>
        </div>
      </transition>

      <!-- Upgrade Modal -->
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
            @click="isUpgradeModalOpen = false"
          >
            Maybe Later
          </button>
          <button
            type="button"
            class="btn-primary"
            :disabled="isUpgrading"
            @click="handleUpgrade"
          >
            <span v-if="isUpgrading" class="loading-spinner mr-2" />
            {{ isUpgrading ? "Redirecting..." : "Upgrade Now" }}
          </button>
        </template>
      </Modal>
    </div>
  </div>
</template>
 
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, reactive, watch, watchEffect } from "vue";
import { nextTick } from "vue";
import { useRoute, navigateTo } from "#imports";
import SectionHeader from "~/components/common/SectionHeader.vue";
import OutputCard from "~/components/spark/OutputCard.vue";
import Chat from "~/components/Chat.vue";
import ItemGrid from "~/components/common/ItemGrid.vue";
import Modal from "~/components/common/Modal.vue";
import { primaryColor, secondaryColor } from "~/composables/useDynamicColors";
import { renderMarkdown } from "~/utils/markdown";
import type { Prisma } from "@prisma/client";
import { useChat } from "~/composables/useChat";
import PageLoader from '~/components/common/PageLoader.vue'
import { useSubscription } from '~/composables/useSubscription'

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
  dendrograms: SparkDendrogram | null;
  isPremium?: boolean;
};

const allSparks = ref<Spark[]>([]);
const { plan: userPlan, loaded: subscriptionLoaded, loadSubscription, maxSparks } = useSubscription()
const projectTotalRuns = ref(0)

// Upgrade modal state
const isUpgradeModalOpen = ref(false);
const isUpgrading = ref(false);
const upgradeModalTitle = ref("");
const upgradeModalMessage = ref("");
const task = ref("");
const outputs = ref<any[]>([]);
const isSavingTask = ref(false);
const isRunningTask = ref(false);
// Declare runStatus early to avoid temporal dead zone in watchers/effects below
const runStatus = ref<"idle" | "running" | "coordinating" | "saving" | "finished" | "error">("idle");
const MAX_SPARKS = computed(() => maxSparks.value)
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

// Limit to MAX_SPARKS for attachments
const assignedSparksLimited = computed(() => assignedSparks.value.slice(0, MAX_SPARKS.value));

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
  const thinkingActions = {
    Designer: ["sketching concepts", "exploring visual solutions", "crafting user experiences", "iterating on layouts", "studying design principles"],
    Engineer: ["analyzing requirements", "designing system architecture", "optimizing algorithms", "debugging solutions", "planning implementation"],
    Artist: ["exploring creative directions", "experimenting with mediums", "developing artistic vision", "crafting visual narratives", "refining techniques"],
    Scientist: ["conducting research", "formulating hypotheses", "analyzing data patterns", "designing experiments", "synthesizing findings"],
    Writer: ["crafting narratives", "developing characters", "structuring content", "refining language", "building worlds"],
    Strategist: ["analyzing market trends", "evaluating opportunities", "planning approaches", "assessing risks", "optimizing outcomes"],
    Educator: ["designing learning experiences", "adapting content", "assessing needs", "creating engagement", "facilitating understanding"],
    Entrepreneur: ["identifying opportunities", "validating ideas", "planning ventures", "analyzing markets", "building strategies"],
  } as const;
  const discipline = (Object.keys(thinkingActions) as Array<keyof typeof thinkingActions>).find((d) =>
    spark.discipline.toLowerCase().includes(String(d).toLowerCase())
  ) || "Creative" as keyof typeof thinkingActions;
  const actions = thinkingActions[discipline] || [
    "brainstorming ideas",
    "exploring possibilities",
    "developing concepts",
    "refining approaches",
    "crafting solutions",
  ];
  const hash = sparkId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const actionIndex = hash % actions.length;
  return actions[actionIndex];
}

function mapOutputForCard(o: any) {
  const sparkId = o.spark?.id || o.sparkId;
  const sparkName = o.spark?.name || o.sparkName || "Spark";
  const color = sparkId ? getSparkColor(String(sparkId)) : "rgb(120,120,120)";
  return {
    id: o.id,
    title: o.title || "Untitled Idea",
    text: o.text,
    coverPrompt: o.coverPrompt,
    coverImageUrl: o.coverImageUrl,
    coverSvg: o.coverSvg,
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
    const s = await $fetch<{ data: Spark[] }>("/api/spark");
    allSparks.value = s.data;
    if (projects.value.length > 0) {
      // default to recent
      if (!route.query.id) {
        selectedProjectId.value = projects.value[0].id;
        await navigateTo({ path: '/spark/projects', query: { id: selectedProjectId.value } });
      } else {
        selectedProjectId.value = String(route.query.id);
      }
      await fetchProjectDetails();
    } else {
      selectedProject.value = null;
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
    const response = await $fetch<{ data: ProjectWithDetails; meta?: { totalRuns?: number } }>(
      `/api/spark/projects/${selectedProjectId.value}`
    );
    selectedProject.value = response.data;
    task.value = selectedProject.value?.task || "";
    outputs.value = (selectedProject.value?.outputs || []).map(mapOutputForCard);
    // Cache run count in a local ref for instant gating
    projectTotalRuns.value = response.meta?.totalRuns ?? 0
  } catch (e: any) {
    error.value = e.data?.message || "Failed to fetch project details.";
    selectedProject.value = null;
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
    "inline-flex items-center justify-center h-8 px-3 rounded-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed space-x-2 text-sm"
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
  // Instant precheck only after subscription has loaded; otherwise rely on server enforcement
  if (subscriptionLoaded.value && userPlan.value !== 'premium' && projectTotalRuns.value >= 3) {
    upgradeModalTitle.value = 'Run Limit Reached'
    upgradeModalMessage.value = 'You have reached the limit of 3 runs per project on the free plan. Upgrade to continue running this project.'
    isUpgradeModalOpen.value = true
    return
  }
  if (draft && draft.length > 0) {
    task.value = draft;
    transcriptDraft.value = "";
  }
  await runTask();
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
    if (process.client) {
      window.dispatchEvent(new Event('project-changed'));
    }
    await navigateTo({ path: '/spark/projects', query: { id: response.data.id } });
  } catch (e: any) {
    if (e?.statusCode === 402) {
      upgradeModalTitle.value = "Project Limit Reached";
      upgradeModalMessage.value = e.data?.message || "Project limit reached. Upgrade to create more projects.";
      isUpgradeModalOpen.value = true;
    } else {
      error.value = e.data?.message || "Failed to create project.";
    }
  } finally {
    isCreatingProject.value = false;
  }
}

if (process.client) {
  window.addEventListener('project-changed', async () => {
    if (selectedProjectId.value) {
      await fetchProjectDetails();
    }
  });
}

const addContextItem = () => { isAddContextModalOpen.value = true; };
const closeAddContextModal = () => {
  isAddContextModalOpen.value = false;
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
      const uploadResponse = await $fetch<{ url: string }>("/api/upload/temp", { method: "POST", body: formData });
      body.filePath = uploadResponse.url;
    }
    await $fetch("/api/spark/context", { method: "POST", body });
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
    await $fetch(`/api/spark/context/${id}`, { method: "DELETE" });
    await fetchProjectDetails();
  } catch (e: any) {
    error.value = e.data?.message || "Failed to delete item.";
  }
};

// Select existing sparks modal state/logic
const isSelectSparksOpen = ref(false);
const selectedToAssign = ref<string[]>([]);
const isAssigningSparks = ref(false);
const unassignedSparks = computed(() =>
  allSparks.value.filter((s) => !assignedSparkIds.value.has(s.id))
);
const availableSparkSlots = computed(() => Math.max(0, MAX_SPARKS.value - assignedSparks.value.length));

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

function handleAddSparksClick() {
  // If subscription not yet loaded, allow modal and rely on server enforcement
  if (!subscriptionLoaded.value) {
    openSelectSparks();
    return;
  }
  if (assignedSparksLimited.value.length < MAX_SPARKS.value) {
    openSelectSparks();
  } else {
    upgradeModalTitle.value = "Spark Limit Reached";
    upgradeModalMessage.value = `You have reached the limit of ${MAX_SPARKS.value} sparks per project on your current plan. Upgrade to add up to 8 sparks per project.`;
    isUpgradeModalOpen.value = true;
  }
}
async function handleAssignSelectedSparks() {
  if (!selectedProjectId.value || selectedToAssign.value.length === 0) return;
  isAssigningSparks.value = true;
  try {
    // Prevent assigning premium sparks if not premium plan (only after subscription has loaded)
    if (subscriptionLoaded.value && userPlan.value !== 'premium') {
      const premiumIds = new Set(allSparks.value.filter(s => s.isPremium).map(s => s.id))
      const hasPremium = selectedToAssign.value.some(id => premiumIds.has(id))
      if (hasPremium) {
        upgradeModalTitle.value = "Premium Spark";
        upgradeModalMessage.value = "One or more selected sparks are premium. Upgrade to add premium sparks to projects.";
        isUpgradeModalOpen.value = true;
        return;
      }
    }
    const capacity = availableSparkSlots.value;
    const toAssign = selectedToAssign.value.slice(0, capacity);
    if (toAssign.length === 0) {
      alert(`This project already has ${MAX_SPARKS.value} sparks.`);
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
    if (e?.statusCode === 402) {
      upgradeModalTitle.value = "Spark Limit Reached";
      upgradeModalMessage.value = e.data?.message || "Spark limit reached. Upgrade to create more sparks.";
      isUpgradeModalOpen.value = true;
    } else {
      error.value = e.data?.message || "Failed to add sparks.";
    }
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
  agentThinking.value = {};
  assignedSparks.value.forEach((spark) => { agentThinking.value[spark.id] = true; });
  isMonologueOpen.value = true;
  try {
    await $fetch(`/api/spark/projects/${selectedProjectId.value}`, { method: "PUT", body: { task: task.value } });
  } catch {}
  let runId: string | undefined;
  try {
    const start = await $fetch<{ runId: string }>(`/api/spark/projects/${selectedProjectId.value}/run.start`, { method: "POST" });
    runId = start.runId;
  } catch (e: any) {
    if (e?.statusCode === 402) {
      upgradeModalTitle.value = "Run Limit Reached";
      upgradeModalMessage.value = e?.data?.message || "You have reached the limit of 3 runs per project on the free plan. Upgrade to continue running this project.";
      isUpgradeModalOpen.value = true;
    } else {
      error.value = e?.data?.message || e?.message || "Failed to start run";
    }
    isRunningTask.value = false;
    runStatus.value = "error";
    return;
  }
  if (currentEventSource) currentEventSource.close();
  const es = new EventSource(`/api/spark/projects/${selectedProjectId.value}/run.stream?runId=${runId}`);
  attachRunEventSource(es);
}

async function cancelTask() {
  if (!selectedProjectId.value) return;
  if (!confirm("Are you sure you want to cancel the current run? This cannot be undone.")) return;
  try {
    await $fetch(`/api/spark/projects/${selectedProjectId.value}/run.cancel`, { method: "POST" });
    if (currentEventSource) { currentEventSource.close(); currentEventSource = null; }
    isRunningTask.value = false;
    runStatus.value = "idle";
    agentEvents.value = [];
    agentThinking.value = {};
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || "Failed to cancel run";
    console.error("Cancel run error:", e);
  }
}

onMounted(() => { fetchProjects(); });
onMounted(async () => { try { await loadSubscription() } catch {} })

// Watch for route query changes to sync selected project
watch(
  () => route.query.id,
  async (newId) => {
    if (newId && newId !== selectedProjectId.value) {
      // Clean up any existing stream and reset run UI state when switching projects
      try {
        if (currentEventSource) {
          currentEventSource.close()
        }
      } catch {}
      currentEventSource = null
      isRunningTask.value = false
      runStatus.value = 'idle'
      agentEvents.value = []
      agentThinking.value = {}
      selectedProjectId.value = newId as string;
      await fetchProjectDetails();
    }
  },
  { immediate: true }
);

watchEffect(async () => {
  if (!selectedProjectId.value) return;
  if (currentEventSource) return;
  try {
    const active = await $fetch<{ runId: string | null; status: string | null }>(`/api/spark/projects/${selectedProjectId.value}/run.active`);
    if (active.runId && active.status === "running") {
      runStatus.value = "running";
      isRunningTask.value = true;
      isMonologueOpen.value = true;
      agentThinking.value = {};
      assignedSparks.value.forEach((spark) => { agentThinking.value[spark.id] = true; });
      const es = new EventSource(`/api/spark/projects/${selectedProjectId.value}/run.stream?runId=${active.runId}`);
      attachRunEventSource(es);
    }
  } catch {}
});

// UI state for monologue & streaming
type AgentEvent = { type: string; sparkId?: string; name?: string; text?: string; error?: string; };
const agentEvents = ref<AgentEvent[]>([]);
const agentThinking = ref<Record<string, boolean>>({});
const isMonologueOpen = ref(true);
const logsContainer = ref<HTMLElement | null>(null);
function scrollToBottom() { if (logsContainer.value) { logsContainer.value.scrollTop = logsContainer.value.scrollHeight; } }

function attachRunEventSource(es: EventSource) {
  currentEventSource = es;
  es.addEventListener("run:started", (e: MessageEvent) => {
    const data = JSON.parse(e.data || "{}");
    agentEvents.value.push({ type: "run:started", name: "Run started", text: `Task: ${data.task}` } as any);
    scrollToBottom();
  });
  es.addEventListener("stream:ready", () => {
    agentEvents.value.push({ type: "stream:ready", name: "System", text: "Connected to live stream." } as any);
    scrollToBottom();
  });
  es.addEventListener("stream:ping", () => {
    // no-op: just keeps the connection fresh; optionally surface minimal UI feedback
  });
  es.addEventListener("agent:started", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    const spark = assignedSparksMap.value.get(d.sparkId);
    const action = spark ? getAgentThinkingDescription(d.sparkId) : "started ideation";
    agentEvents.value.push({ type: "agent:started", name: d.name, text: `Started ${action}` } as any);
    scrollToBottom();
  });
  es.addEventListener("agent:result", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({ type: "agent:result", name: d.name, text: d.text } as any);
    const earlyOutput = {
      id: `early-${d.sparkId}-${Date.now()}`,
      title: "Generating idea...",
      text: d.text,
      persona: { id: d.sparkId, name: d.name || "Spark", color: getSparkColor(String(d.sparkId)) },
      status: "text-only",
    };
    outputs.value.unshift(earlyOutput);
    const currentRunOutputs = outputs.value.filter(o => o.id.startsWith('early-'));
    if (currentRunOutputs.length > 3) {
      const toRemove = currentRunOutputs.slice(3);
      outputs.value = outputs.value.filter(o => !toRemove.includes(o));
    }
    scrollToBottom();
  });
  es.addEventListener("outputs:saving", () => {
    agentEvents.value.push({ type: "outputs:saving", name: "System", text: `Crafting final outputs...` } as any);
    scrollToBottom();
  });
  es.addEventListener("output:created", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({ type: "output:created", name: "System", text: `Output created by ${d.sparkName}` } as any);
    const earlyOutputIndex = outputs.value.findIndex((o) => o.id.startsWith("early-") && o.persona.id === d.sparkId);
    const finalOutput = {
      id: d.id,
      title: d.title || "Untitled Idea",
      text: d.text,
      persona: { id: d.sparkId, name: d.sparkName || "Spark", color: getSparkColor(String(d.sparkId)) },
      status: "complete",
    };
    if (earlyOutputIndex !== -1) {
      outputs.value[earlyOutputIndex] = finalOutput;
    } else {
      outputs.value.unshift(finalOutput);
    }
    const currentRunOutputs = outputs.value.filter(o => o.id.startsWith('early-') || o.status === 'complete');
    if (currentRunOutputs.length > 3) {
      const toRemove = currentRunOutputs.slice(3);
      outputs.value = outputs.value.filter(o => !toRemove.includes(o));
    }
    scrollToBottom();
  });
  // Removed image generation events
  es.addEventListener("agent:error", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({ type: "agent:error", sparkId: d.sparkId, name: d.name, error: d.error } as any);
    scrollToBottom();
  });
  es.addEventListener("agent:finished", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentThinking.value[d.sparkId] = false;
    const spark = assignedSparksMap.value.get(d.sparkId);
    const action = spark ? getAgentThinkingDescription(d.sparkId).replace("ing", "ed") : "finished ideation";
    agentEvents.value.push({ type: "agent:finished", sparkId: d.sparkId, name: d.name, text: `Finished ${action}` } as any);
    scrollToBottom();
  });
  es.addEventListener("coordination:started", () => {
    runStatus.value = "coordinating";
    agentEvents.value.push({ type: "coordination:started", name: "Coordination", text: "Started synthesizing diverse perspectives" } as any);
    scrollToBottom();
  });
  es.addEventListener("coordination:result", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({ type: "coordination:result", name: "Coordinator", text: `Synthesized insights: ${d.text.substring(0, 100)}${d.text.length > 100 ? "..." : ""}` } as any);
    scrollToBottom();
  });
  es.addEventListener("coordination:error", (e: MessageEvent) => {
    const d = JSON.parse(e.data || "{}");
    agentEvents.value.push({ type: "coordination:error", name: "Coordinator", error: d.error } as any);
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
  es.onerror = async () => {
    // Close current source and attempt a quick reconnect if the run is still active.
    try { es.close(); } catch {}
    currentEventSource = null;
    try {
      const active = await $fetch<{ runId: string | null; status: string | null }>(`/api/spark/projects/${selectedProjectId.value}/run.active`)
      if (active.runId && active.status === 'running') {
        agentEvents.value.push({ type: 'connection:retry', name: 'System', text: 'Connection lost, retrying...' } as any)
        const nes = new EventSource(`/api/spark/projects/${selectedProjectId.value}/run.stream?runId=${active.runId}`)
        attachRunEventSource(nes)
        return
      }
    } catch {}
    if (runStatus.value !== 'finished') {
      runStatus.value = 'error'
      isRunningTask.value = false
      agentEvents.value.push({ type: 'connection:error', name: 'System', text: 'Connection error. Check authentication and server logs.' } as any)
    }
  }
}

// Heartbeat: keep UI in running state and auto-reconnect if stream drops (client-only)
let heartbeat: any = null
onMounted(() => {
  if (!process.client) return
  heartbeat = setInterval(async () => {
    try {
      if (!selectedProjectId.value) return
      const active = await $fetch<{ runId: string | null; status: string | null }>(`/api/spark/projects/${selectedProjectId.value}/run.active`)
      if (active.runId && active.status === 'running') {
        // Ensure UI stays in running mode
        isRunningTask.value = true
        if (runStatus.value === 'idle' || runStatus.value === 'error') runStatus.value = 'running'
        // Reattach stream if needed
        if (!currentEventSource) {
          const es = new EventSource(`/api/spark/projects/${selectedProjectId.value}/run.stream?runId=${active.runId}`)
          attachRunEventSource(es)
        }
      }
    } catch {}
  }, 3000)
})

onUnmounted(() => {
  try {
    if (heartbeat) clearInterval(heartbeat)
  } catch {}
  heartbeat = null
})

// Ensure agentThinking is initialized for assigned sparks after reload when a run is active
watch([assignedSparks, isRunningTask, runStatus], () => {
  const isActive = isRunningTask.value || runStatus.value === 'running'
  if (!isActive) return
  if (!assignedSparks.value || assignedSparks.value.length === 0) return
  for (const spark of assignedSparks.value) {
    if (agentThinking.value[spark.id] === undefined) agentThinking.value[spark.id] = true
  }
})

// Output modal state
type UiOutput = { id: string; title: string; text: string; persona: { id: string; name: string; color: string; }; coverSvg?: string; status?: "text-only" | "complete" };
const isOutputModalOpen = ref(false);
const selectedOutput = ref<UiOutput | null>(null);
const refineComment = ref('')
const isRefiningOutput = ref(false)
const isUpdatingIdea = ref(false)
const refineChat = ref<Array<{ role: 'user' | 'assistant'; text: string }>>([])
const refineChatWithGreeting = computed(() => {
  if (!selectedOutput.value) return refineChat.value
  const sparkName = selectedOutput.value.persona?.name || 'Spark'
  const greeting = { role: 'assistant', text: `Hi, I'm ${sparkName}. Got any comments or feedback on my idea?` } as const
  // Prepend greeting unless there is already content
  return [greeting, ...refineChat.value]
})
const isDeletingOutput = ref(false);
const isDeletingAllOutputs = ref(false);

const renderedOutputText = computed(() => {
  if (!selectedOutput.value) return "";
  if (isUpdatingIdea.value) {
    return `<div class=\"animate-pulse space-y-2\"><div class=\"h-3 bg-secondary-300/60 rounded\"></div><div class=\"h-3 bg-secondary-300/60 rounded w-5/6\"></div><div class=\"h-3 bg-secondary-300/60 rounded w-4/6\"></div></div>`
  }
  return renderMarkdown(selectedOutput.value.text);
});
async function openOutputModal(output: UiOutput) { 
  selectedOutput.value = output; 
  refineComment.value = ''; 
  refineChat.value = []; 
  isOutputModalOpen.value = true; 
  try {
    const r = await $fetch<{ data: { output: any; comments: Array<{ role: 'user' | 'assistant'; text: string }> } }>(`/api/spark/outputs/${output.id}`)
    refineChat.value = (r.data.comments || []).map(c => ({ role: (c.role as any) || 'assistant', text: c.text }))
  } catch {}
}
function closeOutputModal() { isOutputModalOpen.value = false; selectedOutput.value = null; }
async function deleteSelectedOutput() {
  if (!selectedOutput.value) return;
  if (!confirm("Delete this idea? This cannot be undone.")) return;
  isDeletingOutput.value = true;
  try {
    await $fetch(`/api/spark/outputs/${selectedOutput.value.id}`, { method: "DELETE" });
    outputs.value = outputs.value.filter((o) => o.id !== selectedOutput.value?.id);
    closeOutputModal();
    if (process.client) { window.dispatchEvent(new Event('project-changed')); }
  } catch (e: any) {
    alert(e.data?.message || "Failed to delete output");
  } finally {
    isDeletingOutput.value = false;
  }
}

async function refineSelectedOutput() {
  if (!selectedOutput.value) return
  const comment = refineComment.value.trim()
  if (!comment) return
  // Chat: append user message and thinking placeholder
  refineChat.value.push({ role: 'user', text: comment })
  const thinkingIndex = refineChat.value.push({ role: 'assistant', text: 'Thinking…' }) - 1
  isRefiningOutput.value = true
  let opMode: 'update' | 'explore' = 'update'
  try {
    const res = await $fetch<{ data: { id: string; mode?: 'update' | 'explore'; title?: string; text?: string; explanation?: string; followups?: string[] } }>(`/api/spark/outputs/${selectedOutput.value.id}`, {
      method: 'PUT',
      body: { comment }
    })
    const mode = res.data.mode || 'update'
    opMode = mode
    if (mode === 'update') {
      // Show skeleton only while applying changes
      isUpdatingIdea.value = true
      const expl = res.data.explanation || 'Updated the idea based on your comment.'
      if (thinkingIndex >= 0) refineChat.value[thinkingIndex] = { role: 'assistant', text: expl }

      await nextTick()
      setTimeout(() => {
        const idx = outputs.value.findIndex(o => o.id === selectedOutput.value?.id)
        if (idx !== -1) {
          if (res.data.text) outputs.value[idx].text = res.data.text
          if (res.data.title) outputs.value[idx].title = res.data.title
          if (res.data.text) selectedOutput.value.text = res.data.text
          if (res.data.title) selectedOutput.value.title = res.data.title
        }
        isUpdatingIdea.value = false
      }, 350)
    } else {
      // explore mode: do not change idea, ask follow-ups
      const lines = [res.data.explanation || 'I have a couple of clarifying questions:']
      if (res.data.followups && res.data.followups.length > 0) {
        for (const q of res.data.followups) lines.push(`- ${q}`)
      }
      if (thinkingIndex >= 0) refineChat.value[thinkingIndex] = { role: 'assistant', text: lines.join('\n') }
    }
  } catch (e: any) {
    if (thinkingIndex >= 0) refineChat.value[thinkingIndex] = { role: 'assistant', text: e?.data?.message || e?.message || 'Failed to update idea' }
  } finally {
    isRefiningOutput.value = false
    if (opMode !== 'update') {
      isUpdatingIdea.value = false
    }
    refineComment.value = ''
  }
}
async function deleteAllOutputs() {
  if (!selectedProjectId.value) return;
  if (outputs.value.length === 0) return;
  if (!confirm("Delete ALL outputs for this project? This cannot be undone.")) return;
  isDeletingAllOutputs.value = true;
  try {
    await $fetch(`/api/spark/projects/${selectedProjectId.value}/outputs`, { method: "DELETE" });
    await fetchProjectDetails();
    if (process.client) { window.dispatchEvent(new Event('project-changed')); }
  } catch (e: any) {
    try {
      await Promise.allSettled(outputs.value.map((o) => $fetch(`/api/spark/outputs/${o.id}`, { method: "DELETE" })));
      await fetchProjectDetails();
      if (process.client) { window.dispatchEvent(new Event('project-changed')); }
    } catch (e2: any) {
      alert(e2?.data?.message || e2?.message || "Failed to delete all outputs");
    }
  } finally {
    isDeletingAllOutputs.value = false;
  }
}

function handleImageGenerated({ outputId, imageUrl }: { outputId: string; imageUrl: string; }) {
  const output = outputs.value.find((o) => o.id === outputId);
  if (output) { output.coverImageUrl = imageUrl; }
}

const isGeneratingModalImage = ref(false);
async function generateCoverImageForModal() {
  if (!selectedOutput.value?.coverPrompt) return;
  isGeneratingModalImage.value = true;
  try {
    const response = await $fetch("/api/spark/generate-cover-image", { method: "POST", body: { coverPrompt: selectedOutput.value.coverPrompt, outputId: selectedOutput.value.id } });
    if (response.success) {
      selectedOutput.value.coverImageUrl = response.imageUrl;
      const output = outputs.value.find((o) => o.id === selectedOutput.value?.id);
      if (output) { output.coverImageUrl = response.imageUrl; }
    }
  } catch (error: any) {
    console.error("Failed to generate cover image:", error);
    alert(error.data?.message || "Failed to generate cover image");
  } finally {
    isGeneratingModalImage.value = false;
  }
}

async function openUpgrade() {
  try {
    const r = await $fetch<{ url: string }>("/api/billing/checkout", { method: 'POST' })
    if (process.client) window.location.href = r.url
  } catch (e: any) {
    alert(e?.data?.message || e?.message || 'Failed to start checkout')
  }
}

async function handleUpgrade() {
  isUpgrading.value = true;
  try {
    const r = await $fetch<{ url: string }>("/api/billing/checkout", { method: 'POST' })
    if (process.client) window.location.href = r.url
  } catch (e: any) {
    alert(e?.data?.message || e?.message || 'Failed to start checkout')
  } finally {
    isUpgrading.value = false;
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

/* Portfolio tile styling */
.portfolio-tile { position: relative; aspect-ratio: 1 / 1; }
.portfolio-tile .tile-media { position: absolute; z-index: 0; transition: opacity 150ms ease-out; width: 100%; height: 100%; }
.portfolio-tile:hover { background-color: hsl(var(--color-primary-500)); }
.portfolio-tile:hover .tile-media { opacity: 1; pointer-events: auto; }
.tile-title { opacity: 0; pointer-events: none; }
.portfolio-tile:hover .tile-title { opacity: 1; color: var(--header-nav-active-color); }

.portfolio-tile button:disabled { opacity: 0.5 !important; cursor: not-allowed !important; }
.portfolio-tile .tile-media svg { width: 100% !important; height: 100% !important; max-width: 100% !important; max-height: 100% !important; object-fit: contain; display: block; }

.svg-container :deep(svg) { width: 100% !important; height: 100% !important; }
:root { --spark-secondary: #888; }
.svg-container { --spark-secondary: v-bind(secondaryColor); }
.svg-container :deep(svg [fill]) { fill: var(--spark-secondary) !important; }
.svg-container :deep(svg [stroke]) { stroke: var(--spark-secondary) !important; }
.svg-container :deep(svg .link) { stroke: var(--spark-secondary) !important; }
.svg-container :deep(svg .spark-node),
.svg-container :deep(svg .method-node),
.svg-container :deep(svg .competency-node) { fill: var(--spark-secondary) !important; stroke: var(--spark-secondary) !important; }
.svg-container :deep(svg .node) { fill: var(--spark-secondary) !important; stroke: var(--spark-secondary) !important; }

/* Ensure SVG uses secondary color when background is primary */
.svg-container :deep(svg) {
  --spark-secondary: v-bind(secondaryColor);
}

.markdown-content :deep(h1) { @apply text-sm font-semibold mt-3 mb-2 text-secondary-900 dark:text-white; }
.markdown-content :deep(h2) { @apply text-base font-semibold mt-3 mb-2 text-secondary-900 dark:text-white; }
.markdown-content :deep(h3) { @apply text-sm font-semibold mt-2 mb-1 text-secondary-900 dark:text-white; }
.markdown-content :deep(p) { @apply my-1.5 text-secondary-700 dark:text-secondary-300 text-base; }
.markdown-content :deep(strong) { @apply font-semibold text-secondary-900 dark:text-white; }
.markdown-content :deep(em) { @apply italic text-secondary-800 dark:text-secondary-200; }
.markdown-content :deep(code) { @apply bg-secondary-100 dark:bg-secondary-800 px-1.5 py-0.5 rounded text-sm font-mono text-secondary-800 dark:text-secondary-200; }
.markdown-content :deep(pre) { @apply bg-secondary-100 dark:bg-secondary-800 p-2 rounded-lg overflow-x-auto my-2 border border-secondary-200 dark:border-secondary-700; }
.markdown-content :deep(ul), .markdown-content :deep(ol) { @apply ml-4 my-1.5 space-y-0.5; }
.markdown-content :deep(li) { @apply my-0.5 text-secondary-700 dark:text-secondary-300; }
.markdown-content :deep(a) { @apply text-blue-600 dark:text-blue-400 hover:underline; }
.markdown-content :deep(blockquote) { @apply border-l-4 border-secondary-300 dark:border-secondary-600 pl-3 my-2 italic text-secondary-600 dark:text-secondary-400; }

/* Artefact card hover state - primary to secondary */
.artefact-card:hover { 
  background-color: v-bind(secondaryColor); 
}

/* Title background changes on hover */
.artefact-card:hover .p-3 {
  background-color: v-bind(secondaryColor) !important;
}

/* Text color changes on hover */
.artefact-card:hover h4 {
  color: v-bind(primaryColor) !important;
}
</style>
