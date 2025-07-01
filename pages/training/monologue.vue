<template>
  <div class="py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
        Monologue Training
      </h1>
      <p class="text-lg text-secondary-600 dark:text-secondary-300">
        Record audio responses to questions to help the AI understand your thought
        process and communication style.
      </p>
    </div>

    <!-- Question List -->
    <div v-if="!activeQuestion" class="space-y-8">
      <!-- Overall Progress -->
      <div class="card dark:bg-secondary-800 dark:border-secondary-700">
        <div class="card-body">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white mb-4">
            Your Progress
          </h2>
          <div
            class="flex items-center justify-between text-sm text-secondary-600 dark:text-secondary-300 mb-2"
          >
            <span>Overall Completion</span>
            <span
              >{{ overallProgress.answered }} /
              {{ overallProgress.total }} Questions</span
            >
          </div>
          <div class="w-full bg-secondary-200 dark:bg-secondary-700 h-2 overflow-hidden">
            <div
              class="h-full bg-primary-600 dark:bg-primary-500 transition-all duration-500 ease-out"
              :style="{ width: overallProgress.percentage + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Unanswered Questions -->
      <div v-if="unansweredQuestions.length > 0" class="card dark:bg-secondary-800 dark:border-secondary-700">
        <div class="card-header dark:border-secondary-700">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">
            Questions to Answer
            <span class="text-sm font-normal text-secondary-500 dark:text-secondary-400 ml-2">
              ({{ unansweredQuestions.length }} remaining)
            </span>
          </h2>
        </div>
        <div class="card-body">
          <ul class="space-y-4">
            <li
              v-for="question in unansweredQuestions"
              :key="question.id"
              class="flex items-center justify-between p-4 rounded-lg bg-secondary-100 dark:bg-secondary-700/50"
            >
              <p class="text-secondary-800 dark:text-secondary-200">
                {{ question.text }}
              </p>
              <div class="flex items-center space-x-4">
                <button @click="selectQuestion(question)" class="btn-primary">
                  Answer
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Answered Questions -->
      <div v-if="answeredQuestions.length > 0" class="card dark:bg-secondary-800 dark:border-secondary-700">
        <div class="card-header dark:border-secondary-700">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">
            Completed Questions
            <span class="text-sm font-normal text-secondary-500 dark:text-secondary-400 ml-2">
              ({{ answeredQuestions.length }} answered)
            </span>
          </h2>
        </div>
        <div class="card-body">
          <ul class="space-y-4">
                         <li
               v-for="question in answeredQuestions"
               :key="question.id"
               class="flex items-center justify-between p-4 rounded-lg bg-secondary-100 dark:bg-secondary-700/50"
             >
              <p class="text-secondary-800 dark:text-secondary-200">
                {{ question.text }}
              </p>
              <div class="flex items-center space-x-4">
                <span class="text-success-600 dark:text-success-400 flex items-center space-x-2">
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span>Answered</span>
                </span>
                <button @click="selectQuestion(question)" class="btn-secondary">
                  View
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Question Detail View -->
    <div v-else>
      <!-- Question Card -->
      <div class="card dark:bg-secondary-800 dark:border-secondary-700 mb-8">
        <div
          class="card-header dark:border-secondary-700 flex justify-between items-center"
        >
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">
            Question
          </h2>
          <button @click="unselectQuestion" class="btn-secondary-sm">
            Back to Questions
          </button>
        </div>
        <div class="card-body">
          <div class="text-lg text-secondary-800 dark:text-secondary-200 leading-relaxed">
            {{ activeQuestion.text }}
          </div>
        </div>
      </div>

      <!-- View Existing Submission -->
      <div v-if="isViewMode && existingSubmission" class="space-y-8 mb-8">
        <!-- Loading State -->
        <div v-if="isLoadingSubmission" class="text-center py-12">
          <div class="loading-spinner mx-auto mb-4"></div>
          <p class="text-secondary-600 dark:text-secondary-400">Loading your submission...</p>
        </div>

        <!-- Existing Submission Display -->
        <div v-else class="space-y-6">
          <!-- Audio Playback -->
          <div class="card dark:bg-secondary-800 dark:border-secondary-700">
            <div class="card-header dark:border-secondary-700">
              <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">
                Your Audio Response
              </h2>
              <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
                Submitted on {{ new Date(existingSubmission.createdAt).toLocaleDateString() }}
                <span v-if="existingSubmission.durationSeconds">
                  • Duration: {{ Math.floor(existingSubmission.durationSeconds / 60) }}:{{ String(existingSubmission.durationSeconds % 60).padStart(2, '0') }}
                </span>
              </p>
            </div>
            <div class="card-body">
              <audio 
                :src="existingSubmission.audioPath" 
                controls 
                class="w-full"
                preload="metadata"
              ></audio>
            </div>
          </div>

          <!-- Supplementary Content Display -->
          <div v-if="existingSubmission.supplementaryFilePath || existingSubmission.supplementaryLink" class="card dark:bg-secondary-800 dark:border-secondary-700">
            <div class="card-header dark:border-secondary-700">
              <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">
                Supplementary Content
              </h2>
            </div>
            <div class="card-body">
              <!-- Supplementary File -->
              <div v-if="existingSubmission.supplementaryFilePath" class="flex items-center space-x-3 p-3 bg-secondary-50 dark:bg-secondary-700/30 rounded-lg">
                <svg class="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div class="flex-1">
                  <h3 class="font-medium text-secondary-900 dark:text-white">Supplementary File</h3>
                  <p class="text-sm text-secondary-600 dark:text-secondary-400">
                    {{ existingSubmission.supplementaryDescription }}
                  </p>
                  <a 
                    :href="existingSubmission.supplementaryFilePath" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm underline"
                  >
                    View File
                  </a>
                </div>
              </div>

              <!-- Supplementary Link -->
              <div v-if="existingSubmission.supplementaryLink" class="flex items-center space-x-3 p-3 bg-secondary-50 dark:bg-secondary-700/30 rounded-lg">
                <svg class="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                </svg>
                <div class="flex-1">
                  <h3 class="font-medium text-secondary-900 dark:text-white">Supplementary Link</h3>
                  <p class="text-sm text-secondary-600 dark:text-secondary-400 mb-1">
                    {{ existingSubmission.supplementaryDescription }}
                  </p>
                  <a 
                    :href="existingSubmission.supplementaryLink" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm underline break-all"
                  >
                    {{ existingSubmission.supplementaryLink }}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="card dark:bg-secondary-800 dark:border-secondary-700">
            <div class="card-body">
              <div class="flex justify-center space-x-4">
                <button 
                  @click="switchToRecordMode"
                  class="btn-primary flex items-center space-x-2"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                  </svg>
                  <span>Record New Response</span>
                </button>
                
                <button 
                  @click="deleteExistingSubmission"
                  :disabled="isDeleting"
                  class="btn-danger flex items-center space-x-2"
                >
                  <span v-if="isDeleting" class="loading-spinner-sm mr-2"></span>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  <span>{{ isDeleting ? 'Deleting...' : 'Delete Response' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recording Interface - Two Column Layout -->
      <div v-if="!isViewMode" class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Left Column: Audio Recording -->
        <div class="card dark:bg-secondary-800 dark:border-secondary-700">
          <div class="card-header dark:border-secondary-700">
            <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">
              Audio Recording
            </h2>
            <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
              Take your time to think and respond naturally to the prompt above
            </p>
          </div>
          <div class="card-body">
            <!-- Recording Controls -->
            <div class="text-center space-y-6">
              <!-- Recording Status -->
              <div class="flex items-center justify-center space-x-4">
                <div
                  v-if="isRecording"
                  class="flex items-center space-x-2 text-error-600 dark:text-error-400"
                >
                  <div class="w-3 h-3 bg-error-600 rounded-full animate-pulse"></div>
                  <span class="font-medium">Recording</span>
                </div>
                <div
                  v-else-if="isPaused"
                  class="flex items-center space-x-2 text-warning-600 dark:text-warning-400"
                >
                  <div class="w-3 h-3 bg-warning-600"></div>
                  <span class="font-medium">Paused</span>
                </div>
                <div
                  v-else
                  class="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400"
                >
                  <div class="w-3 h-3 bg-secondary-400"></div>
                  <span>Ready to record</span>
                </div>

                <!-- Duration -->
                <div class="text-lg font-mono text-secondary-900 dark:text-white">
                  {{ formattedDuration }}
                </div>
              </div>

              <!-- Control Buttons -->
              <div class="flex justify-center space-x-4">
                <button
                  v-if="!isRecording && !recordedBlob"
                  @click="startRecording"
                  class="btn-primary flex items-center space-x-2"
                  :disabled="!permissionGranted"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    ></path>
                  </svg>
                  <span>Start Recording</span>
                </button>

                <template v-if="isRecording">
                  <button
                    v-if="!isPaused"
                    @click="pauseRecording"
                    class="btn-secondary flex items-center space-x-2"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <span>Pause</span>
                  </button>

                  <button
                    v-else
                    @click="resumeRecording"
                    class="btn-primary flex items-center space-x-2"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-4-8V3a1 1 0 011-1h2a1 1 0 011 1v3M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      ></path>
                    </svg>
                    <span>Resume</span>
                  </button>

                  <button
                    @click="handleStopRecording"
                    class="btn-danger flex items-center space-x-2"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 10h6v4H9V10z"
                      ></path>
                    </svg>
                    <span>Stop</span>
                  </button>
                </template>
              </div>

              <!-- Playback Controls -->
              <div v-if="recordedBlob && !isRecording" class="space-y-4">
                <audio
                  ref="audioPlayer"
                  :src="audioUrl"
                  controls
                  class="w-full"
                  @canplay="onAudioCanPlay"
                ></audio>

                <div
                  v-if="isLoadingAudio"
                  class="flex items-center justify-center space-x-2 text-secondary-600 dark:text-secondary-400"
                >
                  <div class="loading-spinner-sm"></div>
                  <span>Loading audio preview...</span>
                </div>

                <div v-show="!isLoadingAudio" class="flex justify-center space-x-4">
                  <button
                    @click="startNewRecording"
                    class="btn-secondary flex items-center space-x-2"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      ></path>
                    </svg>
                    <span>Record Again</span>
                  </button>
                </div>
              </div>

              <!-- Permission Request -->
              <div
                v-if="!permissionGranted && !permissionDenied"
                class="text-secondary-600 dark:text-secondary-400"
              >
                <p>Microphone access is required to record your response.</p>
              </div>

              <!-- Permission Denied -->
              <div v-if="permissionDenied" class="text-error-600 dark:text-error-400">
                <p>
                  Microphone access was denied. Please enable microphone permissions and
                  refresh the page.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Optional Supplementary Content -->
        <div class="card dark:bg-secondary-800 dark:border-secondary-700">
          <div class="card-header dark:border-secondary-700">
            <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">
              Supplementary Content
              <span class="text-sm font-normal text-secondary-500 dark:text-secondary-400">(Optional)</span>
            </h2>
            <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
              Add a file or link that supports your response
            </p>
          </div>
          <div class="card-body space-y-4">
            <!-- Type Selection -->
            <div class="flex space-x-4">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  value="file" 
                  v-model="supplementaryType"
                  @change="clearSupplementaryContent"
                  class="text-primary-600 border-secondary-300 focus:ring-primary-500 dark:border-secondary-600 dark:bg-secondary-700"
                >
                <span class="text-sm text-secondary-700 dark:text-secondary-300">File Upload</span>
              </label>
              <label class="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  value="link" 
                  v-model="supplementaryType"
                  @change="clearSupplementaryContent"
                  class="text-primary-600 border-secondary-300 focus:ring-primary-500 dark:border-secondary-600 dark:bg-secondary-700"
                >
                <span class="text-sm text-secondary-700 dark:text-secondary-300">Link</span>
              </label>
            </div>

            <!-- File Upload Section -->
            <div v-if="supplementaryType === 'file'" class="space-y-4">
              <div>
                <label for="supplementary-file" class="form-label">File (max 10MB)</label>
                <input 
                  id="supplementary-file" 
                  type="file" 
                  @change="handleFileSelect" 
                  class="form-input-file w-full mt-1"
                >
                <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  Supported: Images, documents, PDFs, etc.
                </p>
              </div>
              
              <div v-if="supplementaryFile.file">
                <label for="file-description" class="form-label">File Description</label>
                <input 
                  v-model="supplementaryFile.description" 
                  id="file-description" 
                  type="text" 
                  class="form-input w-full mt-1" 
                  placeholder="Describe what this file contains or represents"
                >
              </div>
              
              <div v-if="supplementaryFile.file" class="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-500/30 rounded-lg p-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <svg class="w-5 h-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="text-success-700 dark:text-success-300 font-medium">{{ supplementaryFile.file.name }}</span>
                  </div>
                  <button 
                    @click="clearSupplementaryContent" 
                    class="text-error-600 hover:text-error-700 dark:hover:text-error-400 p-1 rounded-full hover:bg-error-100 dark:hover:bg-error-900/50 transition-colors"
                    type="button"
                    aria-label="Remove file"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <p class="text-xs text-success-600 dark:text-success-400 mt-1">
                  File size: {{ (supplementaryFile.file.size / 1024 / 1024).toFixed(2) }} MB
                </p>
              </div>

              <div v-if="!supplementaryFile.file" class="text-center py-8">
                <svg class="w-12 h-12 text-secondary-400 dark:text-secondary-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p class="text-secondary-500 dark:text-secondary-400 text-sm">
                  No file selected
                </p>
              </div>
            </div>

            <!-- Link Section -->
            <div v-if="supplementaryType === 'link'" class="space-y-4">
              <div>
                <label for="supplementary-link" class="form-label">URL</label>
                <input 
                  v-model="supplementaryLink.url"
                  id="supplementary-link" 
                  type="url" 
                  class="form-input w-full mt-1" 
                  placeholder="https://example.com"
                >
                <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  Link to relevant content (portfolio, reference, etc.)
                </p>
              </div>

              <div>
                <label for="link-description" class="form-label">Link Description</label>
                <input 
                  v-model="supplementaryLink.description" 
                  id="link-description" 
                  type="text" 
                  class="form-input w-full mt-1" 
                  placeholder="Describe what this link contains or represents"
                >
              </div>

              <div v-if="supplementaryLink.url.trim()" class="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-500/30 rounded-lg p-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <svg class="w-5 h-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                    </svg>
                    <span class="text-success-700 dark:text-success-300 font-medium break-all">{{ supplementaryLink.url }}</span>
                  </div>
                  <button 
                    @click="clearSupplementaryContent" 
                    class="text-error-600 hover:text-error-700 dark:hover:text-error-400 p-1 rounded-full hover:bg-error-100 dark:hover:bg-error-900/50 transition-colors"
                    type="button"
                    aria-label="Remove link"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div v-if="!supplementaryLink.url.trim()" class="text-center py-8">
                <svg class="w-12 h-12 text-secondary-400 dark:text-secondary-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                </svg>
                <p class="text-secondary-500 dark:text-secondary-400 text-sm">
                  No link provided
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Submission Summary -->
      <div v-if="!isViewMode && recordedBlob && !isRecording" class="card dark:bg-secondary-800 dark:border-secondary-700 mb-8">
        <div class="card-header dark:border-secondary-700">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">Ready to Submit</h2>
          <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
            Review your response before submitting
          </p>
        </div>
        <div class="card-body">
          <div class="space-y-4">
            <!-- Audio Recording Summary -->
            <div class="flex items-center space-x-3 p-3 bg-secondary-50 dark:bg-secondary-700/30 rounded-lg">
              <svg class="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
              <div class="flex-1">
                <h3 class="font-medium text-secondary-900 dark:text-white">Audio Recording</h3>
                <p class="text-sm text-secondary-600 dark:text-secondary-400">
                  Duration: {{ formattedDuration }}
                </p>
              </div>
              <span class="px-2 py-1 bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300 text-xs font-medium rounded">
                Ready
              </span>
            </div>

            <!-- Supplementary File Summary -->
            <div v-if="supplementaryFile.file" class="flex items-center space-x-3 p-3 bg-secondary-50 dark:bg-secondary-700/30 rounded-lg">
              <svg class="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <div class="flex-1">
                <h3 class="font-medium text-secondary-900 dark:text-white">{{ supplementaryFile.file.name }}</h3>
                <p class="text-sm text-secondary-600 dark:text-secondary-400">
                  {{ supplementaryFile.description || 'No description provided' }}
                </p>
                <p class="text-xs text-secondary-500 dark:text-secondary-400">
                  {{ (supplementaryFile.file.size / 1024 / 1024).toFixed(2) }} MB
                </p>
              </div>
              <span class="px-2 py-1 bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300 text-xs font-medium rounded">
                Ready
              </span>
            </div>

            <!-- Supplementary Link Summary -->
            <div v-if="supplementaryLink.url.trim()" class="flex items-center space-x-3 p-3 bg-secondary-50 dark:bg-secondary-700/30 rounded-lg">
              <svg class="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
              <div class="flex-1">
                <h3 class="font-medium text-secondary-900 dark:text-white break-all">{{ supplementaryLink.url }}</h3>
                <p class="text-sm text-secondary-600 dark:text-secondary-400">
                  {{ supplementaryLink.description || 'No description provided' }}
                </p>
              </div>
              <span class="px-2 py-1 bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300 text-xs font-medium rounded">
                Ready
              </span>
            </div>

            <!-- Submit Form -->
            <form @submit.prevent="handleSubmit" class="pt-4 border-t border-secondary-200 dark:border-secondary-700">
              <div class="flex justify-center">
                <button
                  type="submit"
                  :disabled="isUploading || Boolean((supplementaryFile.file && !supplementaryFile.description?.trim()) || (supplementaryLink.url.trim() && !supplementaryLink.description?.trim()))"
                  class="btn-primary flex items-center space-x-2"
                >
                  <span v-if="isUploading" class="loading-spinner mr-2"></span>
                  <svg
                    v-else
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    ></path>
                  </svg>
                  <span>{{ isUploading ? "Submitting..." : "Submit Response" }}</span>
                </button>
              </div>
              
              <div v-if="(supplementaryFile.file && !supplementaryFile.description?.trim()) || (supplementaryLink.url.trim() && !supplementaryLink.description?.trim())" class="mt-2 text-center">
                <p class="text-sm text-error-600 dark:text-error-400">
                  Please provide a description for the {{ supplementaryFile.file ? 'uploaded file' : 'link' }} before submitting
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Upload Progress -->
      <div v-if="!isViewMode && isUploading" class="card dark:bg-secondary-800 dark:border-secondary-700 mb-8">
        <div class="card-body">
          <div class="flex items-center justify-between text-sm text-secondary-600 dark:text-secondary-300 mb-2">
            <span>Submitting your response{{ supplementaryFile.file ? ' with supplementary file' : supplementaryLink.url.trim() ? ' with supplementary link' : '' }}...</span>
            <span>{{ Math.round(uploadProgress.percentage) }}%</span>
          </div>
          <div class="w-full bg-secondary-200 dark:bg-secondary-700 h-2 overflow-hidden">
            <div
              class="h-full bg-primary-600 dark:bg-primary-500 transition-all duration-500 ease-out"
              :style="{ width: uploadProgress.percentage + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Error display -->
      <div
        v-if="error"
        class="bg-error-50 border border-error-200 text-error-700 dark:bg-error-900/20 dark:border-error-500/30 dark:text-error-300 px-4 py-3 mb-8"
      >
        {{ error }}
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex justify-between">
      <NuxtLink to="/training/dashboard" class="btn-secondary mt-4">
        Back to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
// Set page metadata
definePageMeta({
  title: "Monologue Training",
  description: "Record audio responses to questions",
});

interface Question {
  id: number;
  category: string;
  text: string;
  status: "unanswered" | "answered";
}

interface ExistingSubmission {
  id: string;
  questionId: number;
  questionText: string;
  audioPath: string;
  durationSeconds?: number;
  supplementaryFilePath?: string;
  supplementaryLink?: string;
  supplementaryDescription?: string;
  createdAt: string;
}

// Composables
const {
  isRecording,
  isPaused,
  formattedDuration,
  error: recordingError,
  startAudioRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
} = useMediaRecorder();

const { uploadBlob, isUploading, uploadProgress, error: uploadError } = useFileUpload();

// State
const questions = ref<Question[]>([
  {
    id: 9,
    category: "Daily Life",
    text: "Do you make a daily to-do list?",
    status: "unanswered",
  },
  {
    id: 10,
    category: "Daily Life",
    text: "How many hours of screen time do you have on average per day?",
    status: "unanswered",
  },
  {
    id: 13,
    category: "Daily Life",
    text: "How many hours of sleep do you typically get per day?",
    status: "unanswered",
  },
  {
    id: 14,
    category: "Daily Life",
    text: "What do you do before going to sleep?",
    status: "unanswered",
  },
  {
    id: 15,
    category: "Daily Life",
    text: "How often do you feel rushed or short on time?",
    status: "unanswered",
  },
  {
    id: 16,
    category: "Daily Life",
    text: "Do you take time for leisure activities each day?",
    status: "unanswered",
  },
  {
    id: 18,
    category: "Daily Life",
    text: "How satisfied are you with your living situation?",
    status: "unanswered",
  },
  {
    id: 20,
    category: "Daily Life",
    text: "Do you recycle regularly?",
    status: "unanswered",
  },
  {
    id: 23,
    category: "Daily Life",
    text: "What is your relationship with plants?",
    status: "unanswered",
  },
  {
    id: 24,
    category: "Daily Life",
    text: "How do you typically manage household repairs?",
    status: "unanswered",
  },
  {
    id: 25,
    category: "Daily Life",
    text: "What would you change in your neighbourhood that you feel safer?",
    status: "unanswered",
  },

  {
    id: 1,
    category: "Daily Life",
    text: "How do you define your gender and are you comfortable with it?",
    status: "unanswered",
  },
  {
    id: 28,
    category: "Daily Life",
    text: "Are you satisfied to be an artist? Why or why not?",
    status: "unanswered",
  },
  {
    id: 29,
    category: "Daily Life",
    text: "How do you manage your monthly budget?",
    status: "unanswered",
  },
  {
    id: 30,
    category: "Daily Life",
    text: "Do you save money regularly?",
    status: "unanswered",
  },
  {
    id: 33,
    category: "Daily Life",
    text: "How often do you check your bank account?",
    status: "unanswered",
  },
  {
    id: 37,
    category: "Daily Life",
    text: "If you socialize with friends and family, how and how often do you do it?",
    status: "unanswered",
  },
  {
    id: 38,
    category: "Daily Life",
    text: "Do you participate in any community activities?",
    status: "unanswered",
  },
  {
    id: 39,
    category: "Daily Life",
    text: "What do you think about social media and how do you use it?",
    status: "unanswered",
  },
  {
    id: 40,
    category: "Daily Life",
    text: "How do you connect to your community?",
    status: "unanswered",
  },
  {
    id: 41,
    category: "Daily Life",
    text: "Do you volunteer your time? If so, how and how often?",
    status: "unanswered",
  },
  {
    id: 42,
    category: "Daily Life",
    text: "Do you know your neighbors?",
    status: "unanswered",
  },
  {
    id: 43,
    category: "Daily Life",
    text: "How often do you have meaningful conversations? Tell us your most recent one.",
    status: "unanswered",
  },
  {
    id: 44,
    category: "Daily Life",
    text: "Do you feel supported by your social network? If so, how?",
    status: "unanswered",
  },
  {
    id: 45,
    category: "Daily Life",
    text: "What are the advantages and disadvantages of online versus in-person social interactions?",
    status: "unanswered",
  },
  {
    id: 46,
    category: "Daily Life",
    text: "How often do you meet new people? How do you do it?",
    status: "unanswered",
  },
  {
    id: 47,
    category: "Daily Life",
    text: "How would you rate your overall health?",
    status: "unanswered",
  },
  {
    id: 51,
    category: "Daily Life",
    text: "How do you manage stress?",
    status: "unanswered",
  },
  {
    id: 54,
    category: "Daily Life",
    text: "Do you take any drugs (alcohol, drugs, etc.)? Which ones? Why?",
    status: "unanswered",
  },
  {
    id: 55,
    category: "Daily Life",
    text: "How do you care about what you eat? Give us some examples?",
    status: "unanswered",
  },
  {
    id: 56,
    category: "Daily Life",
    text: "Do you feel mentally and emotionally well?",
    status: "unanswered",
  },
  {
    id: 57,
    category: "Daily Life",
    text: "How often do you use the internet?",
    status: "unanswered",
  },
  {
    id: 58,
    category: "Daily Life",
    text: "What devices do you use most frequently (smartphone, computer, etc.)?",
    status: "unanswered",
  },
  {
    id: 59,
    category: "Daily Life",
    text: "How do you stay informed about current events?",
    status: "unanswered",
  },
  {
    id: 60,
    category: "Daily Life",
    text: "Do you trust the information you find online?",
    status: "unanswered",
  },
  {
    id: 61,
    category: "Daily Life",
    text: "How often do you experience technical problems with devices?",
    status: "unanswered",
  },
  {
    id: 63,
    category: "Daily Life",
    text: "How comfortable are you with new technology?",
    status: "unanswered",
  },
  {
    id: 64,
    category: "Daily Life",
    text: "Do you worry about online privacy and security?",
    status: "unanswered",
  },
  {
    id: 65,
    category: "Daily Life",
    text: "How do you learn new tech skills?",
    status: "unanswered",
  },
  {
    id: 66,
    category: "Daily Life",
    text: "Do you rely on technology for daily tasks?",
    status: "unanswered",
  },
  {
    id: 67,
    category: "Art",
    text: "Which artists have fascinated you, and why?",
    status: "unanswered",
  },
  {
    id: 68,
    category: "Art",
    text: "What art do you find absolutely terrible, and why?",
    status: "unanswered",
  },
  {
    id: 69,
    category: "Art",
    text: "How would you experimentally determine the size of Europe?",
    status: "unanswered",
  },
  {
    id: 70,
    category: "Art",
    text: "What are your favorite ice cream flavors?",
    status: "unanswered",
  },
  {
    id: 71,
    category: "Art",
    text: "What would you advise Putin right now? What should his strategy be?",
    status: "unanswered",
  },
  { id: 72, category: "Art", text: "What are you most afraid of?", status: "unanswered" },
  { id: 73, category: "Art", text: "What was your first artwork?", status: "unanswered" },
  { id: 74, category: "Art", text: "What color is the sky?", status: "unanswered" },
  { id: 75, category: "Art", text: "How high is the sky?", status: "unanswered" },
  { id: 76, category: "Art", text: "What do you daydream about?", status: "unanswered" },
  {
    id: 77,
    category: "Art",
    text: "What is your favorite animal and why?",
    status: "unanswered",
  },
  {
    id: 78,
    category: "Art",
    text: "Which color is important in your life?",
    status: "unanswered",
  },
  {
    id: 79,
    category: "Art",
    text: "What distinguishes your art from that of the artist you feel closest to?",
    status: "unanswered",
  },
  {
    id: 80,
    category: "Art",
    text: "What materials do you work with?",
    status: "unanswered",
  },
  {
    id: 81,
    category: "Art",
    text: "How much money does it take to be happy?",
    status: "unanswered",
  },
  {
    id: 82,
    category: "Art",
    text: "Who is the most important person in the world to you?",
    status: "unanswered",
  },
  {
    id: 83,
    category: "Art",
    text: "What do you enjoy arguing about?",
    status: "unanswered",
  },
  {
    id: 84,
    category: "Art",
    text: "Which of your artworks would you never sell?",
    status: "unanswered",
  },
  { id: 85, category: "Art", text: "What are the skilss that you posess to create art?", status: "unanswered" },
  {
    id: 86,
    category: "Art",
    text: "How do you know that you've worked too much?",
    status: "unanswered",
  },
  {
    id: 87,
    category: "Art",
    text: "How do you know when an artwork is finished?",
    status: "unanswered",
  },
  {
    id: 88,
    category: "Art",
    text: "How do you recognize if an artwork (by you or others) is good?",
    status: "unanswered",
  },
  {
    id: 89,
    category: "Art",
    text: "How do you express love to another person?",
    status: "unanswered",
  },
  { id: 90, category: "Art", text: "Can children create art?", status: "unanswered" },
  {
    id: 91,
    category: "Art",
    text: "How can one recognize the artist's age from an artwork?",
    status: "unanswered",
  },
  {
    id: 92,
    category: "Art",
    text: "What is your understanding of power?",
    status: "unanswered",
  },
  {
    id: 93,
    category: "Art",
    text: "What does being rich mean to you?",
    status: "unanswered",
  },
  {
    id: 94,
    category: "Art",
    text: "What does being poor mean to you?",
    status: "unanswered",
  },
  { id: 95, category: "Art", text: "What is your goal in life?", status: "unanswered" },
  {
    id: 96,
    category: "Art",
    text: "To whom would you sell your soul, and if so, for how much?",
    status: "unanswered",
  },
  { id: 97, category: "Art", text: 'How would you define "soul"?', status: "unanswered" },
  {
    id: 98,
    category: "Art",
    text: "How many identities do you have, and how would you describe them?",
    status: "unanswered",
  },
  {
    id: 99,
    category: "Art",
    text: "How long does it take for you to finish an artwork?",
    status: "unanswered",
  },
  {
    id: 100,
    category: "Art",
    text: "Which books have influenced your thinking and how?",
    status: "unanswered",
  },
  {
    id: 101,
    category: "Art",
    text: "What is in your will (or if you don't have one, what should be in it)?",
    status: "unanswered",
  },
  { id: 102, category: "Art", text: "What is art for you?", status: "unanswered" },
  {
    id: 103,
    category: "Art",
    text: "What would you like to receive as a gift?",
    status: "unanswered",
  },
  {
    id: 104,
    category: "Art",
    text: "What do you think about when you brush your teeth?",
    status: "unanswered",
  },
  {
    id: 105,
    category: "Art",
    text: "What plants do you have or would you plant in your garden?",
    status: "unanswered",
  },
  {
    id: 106,
    category: "Art",
    text: "Is there a legitimate reason for you to kill another person?",
    status: "unanswered",
  },
  {
    id: 107,
    category: "Art",
    text: "What would be the harshest punishment that could be imposed on you?",
    status: "unanswered",
  },
  { id: 108, category: "Art", text: "What are you afraid of?", status: "unanswered" },
  {
    id: 109,
    category: "Art",
    text: "Which law should be abolished immediately?",
    status: "unanswered",
  },
  {
    id: 110,
    category: "Art",
    text: "Which law should definitely be introduced?",
    status: "unanswered",
  },
  {
    id: 111,
    category: "Art",
    text: "What superpower do you wish to have?",
    status: "unanswered",
  },
  {
    id: 112,
    category: "Art",
    text: "Would you like to live forever, and what would that mean to you?",
    status: "unanswered",
  },
  {
    id: 113,
    category: "Art",
    text:
      "What is something a person you are just getting to know should not find out about you?",
    status: "unanswered",
  },
  { id: 114, category: "Art", text: "What is your favorite joke?", status: "unanswered" },
  {
    id: 115,
    category: "Art",
    text: "What do you take responsibility for?",
    status: "unanswered",
  },
  {
    id: 116,
    category: "Art",
    text: "What five things would you take with you to a deserted island?",
    status: "unanswered",
  },
    {
    id: 117,
    category: "Art",
    text: "Did you ever destroy a work of art?",
    status: "unanswered",
  },
  {
    id: 118,
    category: "Art",
    text: "What do you do to calm down?",
    status: "unanswered",
  },
  {
    id: 119,
    category: "Art",
    text: "What are your forbidden thoughts questions and why?",
    status: "unanswered",
  },
  {
    id: 120,
    category: "Art",
    text: "Have you been ashamed before? When?",
    status: "unanswered",
  },
  {
    id: 121,
    category: "Art",
    text: "What are you proud of and why?",
    status: "unanswered",
  },
  {
    id: 122,
    category: "Art",
    text: "What is your conceptof beauty?",
    status: "unanswered",
  },
  {
    id: 123,
    category: "Art",
    text: "Do you avoid conflicts or do you seek them? Why?",
    status: "unanswered",
  },
  {
    id: 124,
    category: "Art",
    text: "How do you deal with someone who is right-wing?",
    status: "unanswered",
  },
  {
    id: 125,
    category: "Art",
    text: "Do you believe art can change society? Why or why not?",
    status: "unanswered",
  },
  {
    id: 126,
    category: "Art",
    text: "Do you believe there is a god/goddess? How do you get in touch with them?",
    status: "unanswered",
  },
]);

// Shuffle function using Fisher-Yates algorithm
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const unansweredQuestions = computed(() => {
  return shuffleArray(questions.value.filter(q => q.status === "unanswered"));
});

const answeredQuestions = computed(() => {
  return questions.value.filter(q => q.status === "answered").sort((a, b) => a.id - b.id);
});

const overallProgress = computed(() => {
  const totalQuestions = questions.value.length;
  if (totalQuestions === 0) return { answered: 0, total: 0, percentage: 0 };
  const answeredQuestions = questions.value.filter((q) => q.status === "answered").length;
  return {
    answered: answeredQuestions,
    total: totalQuestions,
    percentage: totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0,
  };
});

const activeQuestion = ref<Question | null>(null);
const recordedBlob = ref<Blob | null>(null);
const audioUrl = ref<string>("");
const permissionGranted = ref(false);
const permissionDenied = ref(false);
const error = ref<string | null>(null);
const audioPlayer = ref<HTMLAudioElement>();
const isLoadingAudio = ref(false);

// View mode state
const isViewMode = ref(false);
const existingSubmission = ref<ExistingSubmission | null>(null);
const isLoadingSubmission = ref(false);
const isDeleting = ref(false);

// Supplementary content state
const supplementaryFile = reactive<{ description: string; file: File | null }>({ 
  description: '', 
  file: null 
});

const supplementaryLink = reactive<{ description: string; url: string }>({
  description: '',
  url: ''
});

const supplementaryType = ref<'file' | 'link'>('file');

// Methods
const selectQuestion = async (question: Question) => {
  activeQuestion.value = question;
  error.value = null;
  
  if (question.status === "answered") {
    // View existing submission
    isViewMode.value = true;
    await loadExistingSubmission(question.id);
  } else {
    // Start new recording
    isViewMode.value = false;
    startNewRecording();
  }
};

const unselectQuestion = () => {
  activeQuestion.value = null;
  isViewMode.value = false;
  existingSubmission.value = null;
  startNewRecording();
};

const loadExistingSubmission = async (questionId: number) => {
  isLoadingSubmission.value = true;
  try {
    const response = await $fetch<{ success: boolean; data: ExistingSubmission }>(`/api/monologue/${questionId}`);
    if (response.success) {
      existingSubmission.value = response.data;
    } else {
      error.value = "Failed to load existing submission";
    }
  } catch (err: any) {
    error.value = err.message || "Failed to load existing submission";
  } finally {
    isLoadingSubmission.value = false;
  }
};

const deleteExistingSubmission = async () => {
  if (!activeQuestion.value || !existingSubmission.value) return;
  
  isDeleting.value = true;
  try {
    const response = await $fetch<{ success: boolean; message: string }>(`/api/monologue/${activeQuestion.value.id}`, {
      method: 'DELETE'
    });
    
    if (response.success) {
      // Update question status
      const question = questions.value.find((q) => q.id === activeQuestion.value!.id);
      if (question) {
        question.status = "unanswered";
      }
      
      // Switch to record mode
      switchToRecordMode();
    } else {
      error.value = "Failed to delete submission";
    }
  } catch (err: any) {
    error.value = err.message || "Failed to delete submission";
  } finally {
    isDeleting.value = false;
  }
};

const switchToRecordMode = () => {
  isViewMode.value = false;
  existingSubmission.value = null;
  startNewRecording();
};

const startRecording = async () => {
  const success = await startAudioRecording();
  if (!success) {
    error.value = recordingError.value || "Failed to start recording";
  }
};

const handleStopRecording = async () => {
  isLoadingAudio.value = true;
  const blob = await stopRecording();
  if (blob) {
    recordedBlob.value = blob;
    audioUrl.value = URL.createObjectURL(blob);
  }
};

const onAudioCanPlay = () => {
  isLoadingAudio.value = false;
};

const startNewRecording = () => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
  recordedBlob.value = null;
  audioUrl.value = "";
  error.value = null;
  
  // Clear supplementary content
  clearSupplementaryContent();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    if (file.size > 10 * 1024 * 1024) { // 10MB
      error.value = 'File size cannot exceed 10MB.';
      return;
    }
    supplementaryFile.file = file;
    error.value = null;
  }
};

const clearSupplementaryContent = () => {
  // Clear file
  supplementaryFile.file = null;
  supplementaryFile.description = "";
  const fileInput = document.getElementById('supplementary-file') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
  
  // Clear link
  supplementaryLink.url = "";
  supplementaryLink.description = "";
};

const handleSubmit = async () => {
  if (!recordedBlob.value) {
    error.value = "No recording found";
    return;
  }

  if (!activeQuestion.value) {
    error.value = "No question selected";
    return;
  }

  // Validate supplementary content descriptions
  if (supplementaryFile.file && !supplementaryFile.description.trim()) {
    error.value = "Please provide a description for the uploaded file";
    return;
  }

  if (supplementaryLink.url.trim() && !supplementaryLink.description.trim()) {
    error.value = "Please provide a description for the link";
    return;
  }

  try {
    error.value = null;

    const duration = audioPlayer.value?.duration;
    
    // If there's supplementary content (file or link), use FormData for the entire request
    if (supplementaryFile.file || supplementaryLink.url.trim()) {
      const formData = new FormData();
      formData.append('audio', recordedBlob.value, `monologue_${activeQuestion.value.id}.webm`);
      
      if (supplementaryFile.file) {
        formData.append('supplementaryFile', supplementaryFile.file);
      }
      
      formData.append('data', JSON.stringify({
        question: activeQuestion.value.text,
        questionId: activeQuestion.value.id,
        duration: duration && isFinite(duration) ? Math.round(duration) : 0,
        supplementaryDescription: supplementaryFile.file ? supplementaryFile.description.trim() : supplementaryLink.description.trim(),
        supplementaryLink: supplementaryLink.url.trim() || undefined
      }));

      const response = await $fetch("/api/monologue/upload", {
        method: "POST",
        body: formData
      });

      if (response.success) {
        const question = questions.value.find((q) => q.id === activeQuestion.value!.id);
        if (question) {
          question.status = "answered";
        }
        unselectQuestion();
      } else {
        error.value = "Failed to save recording";
      }
    } else {
      // Use existing uploadBlob method for audio-only uploads
      const additionalData = {
        question: activeQuestion.value.text,
        questionId: activeQuestion.value.id,
        duration: duration && isFinite(duration) ? Math.round(duration) : 0,
      };

      const result = await uploadBlob(
        recordedBlob.value,
        `monologue_${activeQuestion.value.id}.webm`,
        "/api/monologue/upload",
        additionalData,
        { fileFieldName: "audio", additionalDataFieldName: "data" }
      );

      if (result.success) {
        const question = questions.value.find((q) => q.id === activeQuestion.value!.id);
        if (question) {
          question.status = "answered";
        }
        unselectQuestion();
      } else {
        error.value = uploadError.value || "Failed to save recording";
      }
    }
  } catch (err: any) {
    error.value = err.message || "An error occurred while saving your recording";
  }
};

// Check microphone permissions on mount & fetch answered questions
onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    permissionGranted.value = true;
    // Stop the stream immediately - we just needed to check permissions
    stream.getTracks().forEach((track) => track.stop());
  } catch (err) {
    permissionDenied.value = true;
  }

  try {
    const answeredIds = await $fetch<number[]>("/api/monologue/answered");
    const answeredIdSet = new Set(answeredIds);
    questions.value = questions.value.map((q) => ({
      ...q,
      status: answeredIdSet.has(q.id) ? "answered" : "unanswered",
    }));
  } catch (error) {
    console.error("Failed to load answered questions status:", error);
    // We can let the user proceed without this, it's not critical
  }
});

// Cleanup on unmount
onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
});



// Watch for errors from composables
watch([recordingError, uploadError], ([recError, upError]) => {
  error.value = recError || upError;
});
</script>

<style scoped>
.form-label {
  @apply block text-sm font-medium text-secondary-700 dark:text-secondary-300;
}

.form-input-file {
  @apply block w-full text-sm text-secondary-900 border border-secondary-300 rounded-md cursor-pointer bg-secondary-50 dark:text-secondary-400 focus:outline-none dark:bg-secondary-700 dark:border-secondary-600 dark:placeholder-secondary-400
  file:mr-4 file:py-2 file:px-4
  file:rounded-l-md file:border-0
  file:text-sm file:font-semibold
  file:bg-primary-50 file:text-primary-700
  hover:file:bg-primary-100;
}

.loading-spinner-sm {
  @apply w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin;
}
</style>
