<template>
  <div class="py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Monologue Training</h1>
      <p class="text-lg text-secondary-600 dark:text-secondary-300">
        Record audio responses to creative prompts to help the AI understand your thought process and communication style.
      </p>
    </div>

    <!-- Question List -->
    <div v-if="!activeQuestion" class="space-y-8">
      <!-- Overall Progress -->
      <div class="card dark:bg-secondary-800 dark:border-secondary-700">
        <div class="card-body">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white mb-4">Your Progress</h2>
          <div class="flex items-center justify-between text-sm text-secondary-600 dark:text-secondary-300 mb-2">
            <span>Overall Completion</span>
            <span>{{ overallProgress.answered }} / {{ overallProgress.total }} Questions</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: overallProgress.percentage + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Category Navigation -->
      <div class="border-b border-secondary-200 dark:border-secondary-700">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            v-for="(progress, category) in categoryProgress"
            :key="category"
            @click="activeCategory = category"
            :class="[
              activeCategory === category
                ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-secondary-400 dark:hover:text-secondary-200 dark:hover:border-secondary-600',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none'
            ]"
          >
            {{ category }}
            <span :class="[
              activeCategory === category ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-300' : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-200',
              'ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium'
            ]">
              {{ progress.answered }}/{{ progress.total }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Active Category Questions -->
      <div v-if="activeCategory && groupedQuestions[activeCategory]" class="card dark:bg-secondary-800 dark:border-secondary-700">
        <div class="card-body">
          <ul class="space-y-4">
            <li v-for="question in groupedQuestions[activeCategory]" :key="question.id" class="flex items-center justify-between p-4 rounded-lg bg-secondary-100 dark:bg-secondary-700/50">
              <p class="text-secondary-800 dark:text-secondary-200">{{ question.text }}</p>
              <div class="flex items-center space-x-4">
                <span v-if="question.status === 'answered'" class="text-success-600 dark:text-success-400 flex items-center space-x-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>Answered</span>
                </span>
                <button @click="selectQuestion(question)" class="btn-primary">
                  {{ question.status === 'answered' ? 'Record Again' : 'Answer' }}
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Recorder View -->
    <div v-else>
      <!-- Question Card -->
      <div class="card dark:bg-secondary-800 dark:border-secondary-700 mb-8">
        <div class="card-header dark:border-secondary-700 flex justify-between items-center">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">Creative Prompt</h2>
          <button @click="unselectQuestion" class="btn-secondary-sm">Back to Questions</button>
        </div>
        <div class="card-body">
          <div class="text-lg text-secondary-800 dark:text-secondary-200 leading-relaxed">
            {{ activeQuestion.text }}
          </div>
        </div>
      </div>

      <!-- Recording Interface -->
      <div class="card dark:bg-secondary-800 dark:border-secondary-700 mb-8">
        <div class="card-header dark:border-secondary-700">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">Audio Recording</h2>
          <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
            Take your time to think and respond naturally to the prompt above
          </p>
        </div>
        <div class="card-body">
          <!-- Recording Controls -->
          <div class="text-center space-y-6">
            <!-- Recording Status -->
            <div class="flex items-center justify-center space-x-4">
              <div v-if="isRecording" class="flex items-center space-x-2 text-error-600 dark:text-error-400">
                <div class="w-3 h-3 bg-error-600 rounded-full animate-pulse"></div>
                <span class="font-medium">Recording</span>
              </div>
              <div v-else-if="isPaused" class="flex items-center space-x-2 text-warning-600 dark:text-warning-400">
                <div class="w-3 h-3 bg-warning-600"></div>
                <span class="font-medium">Paused</span>
              </div>
              <div v-else class="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400">
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
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                </svg>
                <span>Start Recording</span>
              </button>

              <template v-if="isRecording">
                <button
                  v-if="!isPaused"
                  @click="pauseRecording"
                  class="btn-secondary flex items-center space-x-2"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Pause</span>
                </button>

                <button
                  v-else
                  @click="resumeRecording"
                  class="btn-primary flex items-center space-x-2"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-4-8V3a1 1 0 011-1h2a1 1 0 011 1v3M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                  <span>Resume</span>
                </button>

                <button
                  @click="handleStopRecording"
                  class="btn-danger flex items-center space-x-2"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9V10z"></path>
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
              
              <div v-if="isLoadingAudio" class="flex items-center justify-center space-x-2 text-secondary-600 dark:text-secondary-400">
                <div class="loading-spinner-sm"></div>
                <span>Loading audio preview...</span>
              </div>

              <div v-show="!isLoadingAudio" class="flex justify-center space-x-4">
                <button
                  @click="startNewRecording"
                  class="btn-secondary flex items-center space-x-2"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  <span>Record Again</span>
                </button>
                
                <button
                  @click="handleSubmit"
                  :disabled="isUploading"
                  class="btn-primary flex items-center space-x-2"
                >
                  <span v-if="isUploading" class="loading-spinner mr-2"></span>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <span>{{ isUploading ? 'Uploading...' : 'Save & Continue' }}</span>
                </button>
              </div>
            </div>

            <!-- Permission Request -->
            <div v-if="!permissionGranted && !permissionDenied" class="text-secondary-600 dark:text-secondary-400">
              <p>Microphone access is required to record your response.</p>
            </div>

            <!-- Permission Denied -->
            <div v-if="permissionDenied" class="text-error-600 dark:text-error-400">
              <p>Microphone access was denied. Please enable microphone permissions and refresh the page.</p>
            </div>
          </div>

          <!-- Upload Progress -->
          <div v-if="isUploading" class="mt-6">
            <div class="flex items-center justify-between text-sm text-secondary-600 dark:text-secondary-300 mb-2">
              <span>Uploading recording...</span>
              <span>{{ Math.round(uploadProgress.percentage) }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: uploadProgress.percentage + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error display -->
      <div v-if="error" class="bg-error-50 border border-error-200 text-error-700 dark:bg-error-900/20 dark:border-error-500/30 dark:text-error-300 px-4 py-3 mb-8">
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
  title: 'Monologue Training',
  description: 'Record audio responses to creative prompts'
})

interface Question {
  id: number;
  category: string;
  text: string;
  status: 'unanswered' | 'answered';
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
  stopRecording
} = useMediaRecorder()

const {
  uploadBlob,
  isUploading,
  uploadProgress,
  error: uploadError
} = useFileUpload()

// State
const questions = ref<Question[]>([
  { id: 7, category: 'Daily Life', text: 'What time do you typically wake up on weekdays?', status: 'unanswered' },
  { id: 8, category: 'Daily Life', text: 'How much time do you spend commuting each day?', status: 'unanswered' },
  { id: 9, category: 'Daily Life', text: 'Do you make a daily to-do list?', status: 'unanswered' },
  { id: 10, category: 'Daily Life', text: 'How many hours of screen time do you have on average per day?', status: 'unanswered' },
  { id: 11, category: 'Daily Life', text: 'How often do you eat out versus cooking at home?', status: 'unanswered' },
  { id: 12, category: 'Daily Life', text: 'Do you exercise regularly (at least three times a week)?', status: 'unanswered' },
  { id: 13, category: 'Daily Life', text: 'How many hours of sleep do you typically get per night?', status: 'unanswered' },
  { id: 14, category: 'Daily Life', text: 'Do you have a set bedtime routine?', status: 'unanswered' },
  { id: 15, category: 'Daily Life', text: 'How often do you feel rushed or short on time?', status: 'unanswered' },
  { id: 16, category: 'Daily Life', text: 'Do you take time for leisure activities each day?', status: 'unanswered' },
  { id: 17, category: 'Daily Life', text: 'Do you rent or own your home?', status: 'unanswered' },
  { id: 18, category: 'Daily Life', text: 'How satisfied are you with your living situation?', status: 'unanswered' },
  { id: 19, category: 'Daily Life', text: 'How often do you do household chores?', status: 'unanswered' },
  { id: 20, category: 'Daily Life', text: 'Do you recycle regularly?', status: 'unanswered' },
  { id: 21, category: 'Daily Life', text: 'How much do you spend on groceries per week?', status: 'unanswered' },
  { id: 22, category: 'Daily Life', text: 'Do you have any pets?', status: 'unanswered' },
  { id: 23, category: 'Daily Life', text: 'Do you have a garden or plants at home?', status: 'unanswered' },
  { id: 24, category: 'Daily Life', text: 'How do you typically manage household repairs?', status: 'unanswered' },
  { id: 25, category: 'Daily Life', text: 'Do you feel safe in your neighborhood?', status: 'unanswered' },
  { id: 26, category: 'Daily Life', text: 'How often do you declutter your living space?', status: 'unanswered' },
  { id: 27, category: 'Daily Life', text: 'What is your current employment status?', status: 'unanswered' },
  { id: 28, category: 'Daily Life', text: 'How satisfied are you with your current job?', status: 'unanswered' },
  { id: 29, category: 'Daily Life', text: 'How do you manage your monthly budget?', status: 'unanswered' },
  { id: 30, category: 'Daily Life', text: 'Do you save money regularly?', status: 'unanswered' },
  { id: 31, category: 'Daily Life', text: 'Do you have any debt?', status: 'unanswered' },
  { id: 32, category: 'Daily Life', text: 'How do you pay your bills?', status: 'unanswered' },
  { id: 33, category: 'Daily Life', text: 'How often do you check your bank account?', status: 'unanswered' },
  { id: 34, category: 'Daily Life', text: 'Do you invest money?', status: 'unanswered' },
  { id: 35, category: 'Daily Life', text: 'How do you plan for retirement?', status: 'unanswered' },
  { id: 36, category: 'Daily Life', text: 'Do you feel financially secure?', status: 'unanswered' },
  { id: 37, category: 'Daily Life', text: 'How often do you socialize with friends and family?', status: 'unanswered' },
  { id: 38, category: 'Daily Life', text: 'Do you participate in any community activities?', status: 'unanswered' },
  { id: 39, category: 'Daily Life', text: 'How often do you use social media?', status: 'unanswered' },
  { id: 40, category: 'Daily Life', text: 'Do you feel connected to your community?', status: 'unanswered' },
  { id: 41, category: 'Daily Life', text: 'Do you volunteer your time?', status: 'unanswered' },
  { id: 42, category: 'Daily Life', text: 'Do you know your neighbors?', status: 'unanswered' },
  { id: 43, category: 'Daily Life', text: 'How often do you have meaningful conversations?', status: 'unanswered' },
  { id: 44, category: 'Daily Life', text: 'Do you feel supported by your social network?', status: 'unanswered' },
  { id: 45, category: 'Daily Life', text: 'Do you prefer online or in-person social interactions?', status: 'unanswered' },
  { id: 46, category: 'Daily Life', text: 'How often do you meet new people?', status: 'unanswered' },
  { id: 47, category: 'Daily Life', text: 'How would you rate your overall health?', status: 'unanswered' },
  { id: 48, category: 'Daily Life', text: 'Do you have any chronic health conditions?', status: 'unanswered' },
  { id: 49, category: 'Daily Life', text: 'How often do you visit a doctor?', status: 'unanswered' },
  { id: 50, category: 'Daily Life', text: 'Do you take any medications regularly?', status: 'unanswered' },
  { id: 51, category: 'Daily Life', text: 'How do you manage stress?', status: 'unanswered' },
  { id: 52, category: 'Daily Life', text: 'Do you practice any mindfulness or relaxation techniques?', status: 'unanswered' },
  { id: 53, category: 'Daily Life', text: 'How often do you drink alcohol?', status: 'unanswered' },
  { id: 54, category: 'Daily Life', text: 'Do you smoke or use tobacco products?', status: 'unanswered' },
  { id: 55, category: 'Daily Life', text: 'How do you maintain a healthy diet?', status: 'unanswered' },
  { id: 56, category: 'Daily Life', text: 'Do you feel mentally and emotionally well?', status: 'unanswered' },
  { id: 57, category: 'Daily Life', text: 'How often do you use the internet?', status: 'unanswered' },
  { id: 58, category: 'Daily Life', text: 'What devices do you use most frequently (smartphone, computer, etc.)?', status: 'unanswered' },
  { id: 59, category: 'Daily Life', text: 'How do you stay informed about current events?', status: 'unanswered' },
  { id: 60, category: 'Daily Life', text: 'Do you trust the information you find online?', status: 'unanswered' },
  { id: 61, category: 'Daily Life', text: 'How often do you experience technical problems with devices?', status: 'unanswered' },
  { id: 62, category: 'Daily Life', text: 'Do you use online banking or shopping?', status: 'unanswered' },
  { id: 63, category: 'Daily Life', text: 'How comfortable are you with new technology?', status: 'unanswered' },
  { id: 64, category: 'Daily Life', text: 'Do you worry about online privacy and security?', status: 'unanswered' },
  { id: 65, category: 'Daily Life', text: 'How do you learn new tech skills?', status: 'unanswered' },
  { id: 66, category: 'Daily Life', text: 'Do you rely heavily on technology for daily tasks?', status: 'unanswered' },
  { id: 67, category: 'Art', text: 'Which artists have fascinated you, and why?', status: 'unanswered' },
  { id: 68, category: 'Art', text: 'What art do you find absolutely terrible, and why?', status: 'unanswered' },
  { id: 69, category: 'Art', text: 'How would you experimentally determine the size of Europe?', status: 'unanswered' },
  { id: 70, category: 'Art', text: 'What are your favorite ice cream flavors?', status: 'unanswered' },
  { id: 71, category: 'Art', text: 'What would you advise Putin right now? What should his strategy be?', status: 'unanswered' },
  { id: 72, category: 'Art', text: 'What are you most afraid of?', status: 'unanswered' },
  { id: 73, category: 'Art', text: 'What was your first artwork?', status: 'unanswered' },
  { id: 74, category: 'Art', text: 'What color is the sky?', status: 'unanswered' },
  { id: 75, category: 'Art', text: 'How high is the sky?', status: 'unanswered' },
  { id: 76, category: 'Art', text: 'What do you daydream about?', status: 'unanswered' },
  { id: 77, category: 'Art', text: 'What is your favorite animal?', status: 'unanswered' },
  { id: 78, category: 'Art', text: 'Which color is important in your life?', status: 'unanswered' },
  { id: 79, category: 'Art', text: 'What distinguishes your art from that of the artist you feel closest to?', status: 'unanswered' },
  { id: 80, category: 'Art', text: 'What materials do you work with?', status: 'unanswered' },
  { id: 81, category: 'Art', text: 'How much money does it take to be happy?', status: 'unanswered' },
  { id: 82, category: 'Art', text: 'Who is the most important person in the world to you?', status: 'unanswered' },
  { id: 83, category: 'Art', text: 'What do you enjoy arguing about?', status: 'unanswered' },
  { id: 84, category: 'Art', text: 'Which of your artworks would you never sell?', status: 'unanswered' },
  { id: 85, category: 'Art', text: 'What is your daily routine?', status: 'unanswered' },
  { id: 86, category: 'Art', text: 'How do you know that you\'ve worked too much?', status: 'unanswered' },
  { id: 87, category: 'Art', text: 'How do you know when an artwork is finished?', status: 'unanswered' },
  { id: 88, category: 'Art', text: 'How do you recognize if an artwork (by you or others) is good?', status: 'unanswered' },
  { id: 89, category: 'Art', text: 'How do you express love to another person?', status: 'unanswered' },
  { id: 90, category: 'Art', text: 'Can children create art?', status: 'unanswered' },
  { id: 91, category: 'Art', text: 'How can one recognize the artist\'s age from an artwork?', status: 'unanswered' },
  { id: 92, category: 'Art', text: 'What is your understanding of power?', status: 'unanswered' },
  { id: 93, category: 'Art', text: 'What does being rich mean to you?', status: 'unanswered' },
  { id: 94, category: 'Art', text: 'What does being poor mean to you?', status: 'unanswered' },
  { id: 95, category: 'Art', text: 'What is your goal in life?', status: 'unanswered' },
  { id: 96, category: 'Art', text: 'To whom would you sell your soul, and if so, for how much?', status: 'unanswered' },
  { id: 97, category: 'Art', text: 'How would you define "soul"?', status: 'unanswered' },
  { id: 98, category: 'Art', text: 'How many identities do you have, and how would you describe them?', status: 'unanswered' },
  { id: 99, category: 'Art', text: 'How long does it take for you to finish an artwork?', status: 'unanswered' },
  { id: 100, category: 'Art', text: 'How many books have you read?', status: 'unanswered' },
  { id: 101, category: 'Art', text: 'What is in your will (or if you don\'t have one, what should be in it)?', status: 'unanswered' },
  { id: 102, category: 'Art', text: 'What is art for you?', status: 'unanswered' },
  { id: 103, category: 'Art', text: 'What would you like to receive as a gift?', status: 'unanswered' },
  { id: 104, category: 'Art', text: 'What do you think about when you brush your teeth?', status: 'unanswered' },
  { id: 105, category: 'Art', text: 'What plants do you have or would you plant in your garden?', status: 'unanswered' },
  { id: 106, category: 'Art', text: 'Is there a legitimate reason for you to kill another person?', status: 'unanswered' },
  { id: 107, category: 'Art', text: 'What would be the harshest punishment that could be imposed on you?', status: 'unanswered' },
  { id: 108, category: 'Art', text: 'What are you afraid of?', status: 'unanswered' },
  { id: 109, category: 'Art', text: 'Which law should be abolished immediately?', status: 'unanswered' },
  { id: 110, category: 'Art', text: 'Which law should definitely be introduced?', status: 'unanswered' },
  { id: 111, category: 'Art', text: 'What superpower do you wish you had?', status: 'unanswered' },
  { id: 112, category: 'Art', text: 'Would you like to live forever, and what would that mean to you?', status: 'unanswered' },
  { id: 113, category: 'Art', text: 'What is something a person you are just getting to know should not find out about you?', status: 'unanswered' },
  { id: 114, category: 'Art', text: 'What is your favorite joke?', status: 'unanswered' },
  { id: 115, category: 'Art', text: 'What do you take responsibility for?', status: 'unanswered' },
  { id: 116, category: 'Art', text: 'What five things would you take with you to a deserted island?', status: 'unanswered' },
])

const groupedQuestions = computed(() => {
  return questions.value.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = []
    }
    acc[question.category].push(question)
    return acc
  }, {} as Record<string, Question[]>)
})

const activeCategory = ref<string | null>(null)

const categoryProgress = computed(() => {
  const progress: Record<string, { answered: number; total: number }> = {}
  for (const category in groupedQuestions.value) {
    const questionsInCategory = groupedQuestions.value[category]
    const answeredCount = questionsInCategory.filter(q => q.status === 'answered').length
    progress[category] = {
      answered: answeredCount,
      total: questionsInCategory.length,
    }
  }
  return progress
})

const overallProgress = computed(() => {
    const totalQuestions = questions.value.length
    if (totalQuestions === 0) return { answered: 0, total: 0, percentage: 0 }
    const answeredQuestions = questions.value.filter(q => q.status === 'answered').length
    return {
        answered: answeredQuestions,
        total: totalQuestions,
        percentage: totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0
    }
})

const activeQuestion = ref<Question | null>(null)
const recordedBlob = ref<Blob | null>(null)
const audioUrl = ref<string>('')
const permissionGranted = ref(false)
const permissionDenied = ref(false)
const error = ref<string | null>(null)
const audioPlayer = ref<HTMLAudioElement>()
const isLoadingAudio = ref(false)

// Methods
const selectQuestion = (question: Question) => {
  activeQuestion.value = question
  startNewRecording()
}

const unselectQuestion = () => {
  activeQuestion.value = null
  startNewRecording()
}

const startRecording = async () => {
  const success = await startAudioRecording()
  if (!success) {
    error.value = recordingError.value || 'Failed to start recording'
  }
}

const handleStopRecording = async () => {
  isLoadingAudio.value = true
  const blob = await stopRecording()
  if (blob) {
    recordedBlob.value = blob
    audioUrl.value = URL.createObjectURL(blob)
  }
}

const onAudioCanPlay = () => {
  isLoadingAudio.value = false
}

const startNewRecording = () => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  recordedBlob.value = null
  audioUrl.value = ''
  error.value = null
}

const handleSubmit = async () => {
  if (!recordedBlob.value) {
    error.value = 'No recording found'
    return
  }

  if (!activeQuestion.value) {
    error.value = 'No question selected'
    return
  }

  try {
    error.value = null
    
    const duration = audioPlayer.value?.duration
    const additionalData = {
      question: activeQuestion.value.text,
      questionId: activeQuestion.value.id,
      duration: (duration && isFinite(duration)) ? Math.round(duration) : 0,
    }

    const result = await uploadBlob(
      recordedBlob.value,
      `monologue_${activeQuestion.value.id}.webm`,
      '/api/monologue/upload',
      additionalData,
      { fileFieldName: 'audio', additionalDataFieldName: 'data' }
    )

    if (result.success) {
      const question = questions.value.find(q => q.id === activeQuestion.value!.id)
      if (question) {
        question.status = 'answered'
      }
      unselectQuestion()
    } else {
      error.value = uploadError.value || 'Failed to save recording'
    }
  } catch (err: any) {
    error.value = err.message || 'An error occurred while saving your recording'
  }
}

// Check microphone permissions on mount & fetch answered questions
onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    permissionGranted.value = true
    // Stop the stream immediately - we just needed to check permissions
    stream.getTracks().forEach(track => track.stop())
  } catch (err) {
    permissionDenied.value = true
  }

  try {
    const answeredIds = await $fetch<number[]>('/api/monologue/answered')
    const answeredIdSet = new Set(answeredIds)
    questions.value = questions.value.map(q => ({
      ...q,
      status: answeredIdSet.has(q.id) ? 'answered' : 'unanswered'
    }))
  } catch (error) {
    console.error('Failed to load answered questions status:', error)
    // We can let the user proceed without this, it's not critical
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})

// Set initial active category
watch(groupedQuestions, (newGroupedQuestions) => {
  if (!activeCategory.value && Object.keys(newGroupedQuestions).length > 0) {
    activeCategory.value = Object.keys(newGroupedQuestions)[0]
  }
}, { immediate: true })

// Watch for errors from composables
watch([recordingError, uploadError], ([recError, upError]) => {
  error.value = recError || upError
})
</script> 