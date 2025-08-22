<template>
  <div class="chat-wrapper h-full flex flex-col">
    <!-- ======================================================================= -->
    <!-- Full-page (non-embedded) layout -->
    <!-- ======================================================================= -->
    <div v-if="!embedded" class="py-8 container-wide">
      <!-- Header with progress like portfolio/projects -->
      <section class="border-b-4 border-secondary-200 dark:border-secondary-700 pb-4 mb-4 relative">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <h1 class="text-3xl font-bold">Chat</h1>
          <div v-if="progressPercent < 100" class=" text-sm  font-medium text-secondary-700 dark:text-secondary-300">
            <span>{{ displayPercent }}% until your own spark</span>
          </div>
        </div>
        <div class="absolute left-0 right-0 bottom-0 h-1 bg-secondary-200 dark:bg-secondary-700">
          <div class="h-full bg-primary-500 transition-all duration-500" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </section>
      <div
        class="flex flex-col h-[75vh] bg-transparent dark:bg-transparent dark:text-white border-4 border-primary-500 p-4 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-sm"
      >
        <div class="flex flex-col flex-1 min-h-0">
          <!-- Messages -->
          <div
            ref="chatContainer"
            class="flex-1 overflow-y-auto p-4 space-y-4"
            style="scroll-behavior: smooth"
          >
            <div
              v-for="(message, index) in displayMessages"
              :key="index"
              :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']"
            >
              <div
                v-if="shouldShowAssistantAvatar(message, index)"
                class="flex-shrink-0 w-12 h-12 flex items-center justify-start mr-2 overflow-hidden"
              >
                <div class="x-mask" aria-hidden="true"></div>
              </div>

              <div
                :class="[
                  'rounded-lg max-w-lg',
                  message.role === 'user'
                    ? 'text-white'
                    : 'text-white',
                ]"
                :style="message.role === 'user' 
                  ? { backgroundColor: secondaryColor, color: primaryColor }
                  : { backgroundColor: primaryColor, color: secondaryColor }
                "
              >
                <MessageContent :message="message" />
              </div>
            </div>

            <!-- Loading indicator -->
            <div class="flex" v-if="isLoading">
              <div class="flex-shrink-0 w-12 h-12 flex items-center justify-start mr-2 overflow-hidden">
                <div class="x-mask" aria-hidden="true"></div>
              </div>
              <div class="flex items-center p-4">
                <div class="blinking-cursor w-3 h-6 bg-primary-500"></div>
              </div>
            </div>

            <!-- Error message -->
            <div v-if="error" class="mb-4 text-center text-red-500">
              {{ error.message }}
            </div>

            <!-- Upload Progress Indicator -->
            <div v-if="isUploadingFile" class="flex justify-start">
              <div class="flex-shrink-0 w-12 h-12 flex items-center justify-start mr-2 overflow-hidden">
                <div class="x-mask" aria-hidden="true"></div>
              </div>
              <div class="inline-block py-2 px-3 rounded-lg max-w-[65%] bg-secondary-200 dark:bg-secondary-700 text-primary-500">
                <div class="flex items-center">
                  <div class="blinking-cursor w-3 h-6 bg-primary-500"></div>
                </div>
              </div>
            </div>

            <!-- Spacer to ensure last message is visible above input -->
            <div class="h-4"></div>
          </div>

          <!-- Input area -->
          <div class="p-4 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900/50 rounded-b-lg">
            <form @submit.prevent="handleSubmit" class="flex flex-col space-y-3">
              <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden" />

              <div class="relative">
                <textarea
                  v-model="inputProxy"
                  @keydown.enter.exact.prevent="handleSubmit"
                  @keydown.enter.shift.exact="handleShiftEnter"
                  @focus="initializeChat"
                  :placeholder="isTranscribing ? 'Transcribing…' : 'Type your message...'"
                  class="w-full p-4 border rounded-lg bg-none border-secondary-300 dark:border-secondary-700 focus:outline-none focus:ring-0 focus:border-secondary-400 dark:focus:border-secondary-600 resize-none min-h-[120px] text-base"
                  :disabled="isLoading"
                  rows="4"
                  ref="messageInput"
                />

              </div>

              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <button
                    type="button"
                    @click="onRecordClick"
                    :disabled="isLoading || isUploadingFile || isTranscribing"
                    :class="[actionButtonClass, isRecording ? 'bg-red-500 text-white' : '']"
                    aria-label="Record a voice memo"
                  >
                    <div :class="isRecording ? 'stop-icon-mask w-5 h-5' : 'record-icon-mask w-5 h-5'" aria-hidden="true"></div>
                    <span>{{ isRecording ? 'Stop' : 'Record' }}</span>
                  </button>

                  <button
                    type="button"
                    @click="triggerFileUpload"
                    :disabled="isLoading || isUploadingFile || isRecording || isTranscribing"
                    :class="actionButtonClass"
                    aria-label="Upload a file"
                  >
                    <div class="upload-icon-mask w-5 h-5" aria-hidden="true"></div>
                    <span>Attach</span>
                  </button>
                </div>

                <button
                  type="submit"
                  :class="actionButtonClass"
                  :disabled="isLoading || !canSubmit || isTranscribing"
                >
                  <div class="send-icon-mask w-5 h-5" aria-hidden="true"></div>
                </button>
              </div>
            </form>
            <p v-if="uploadError" class="text-xs text-red-500 mt-1 pl-2">
              {{ uploadError }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================================= -->
    <!-- Embedded layout (for sidebar) -->
    <!-- ======================================================================= -->
    <div v-else class="flex-1 flex flex-col min-h-0">
      <!-- Messages -->
      <div
        ref="chatContainer"
        class="flex-1 min-h-0 overflow-y-auto text-base pr-8"
        style="scroll-behavior: smooth"
      >
        <div
          v-for="(message, index) in displayMessages"
          :key="index"
          :class="['mb-4 flex', message.role === 'user' ? 'justify-end' : 'justify-start']"
        >
          <div
            v-if="shouldShowAssistantAvatar(message, index)"
            class="flex-shrink-0 w-12 h-12 flex items-center justify-center mr-2 overflow-hidden"
          >
            <div class="x-mask w-12 h-12" aria-hidden="true"></div>
          </div>

          <div 
            :class="[
              'max-w-[65%] rounded-lg p-3 text-white'
            ]"
            :style="message.role === 'user' 
              ? { backgroundColor: secondaryColor, color: primaryColor }
              : { backgroundColor: primaryColor, color: secondaryColor }
            "
          >
            <MessageContent :message="message" />
          </div>
        </div>

        <!-- Loading indicator -->
        <div class="mb-4 flex justify-start" v-if="isLoading">
          <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center mr-2 overflow-hidden">
            <div class="x-mask w-12 h-12" aria-hidden="true"></div>
          </div>
          <div class="flex items-center">
            <div class="blinking-cursor w-3 h-12 bg-primary-500"></div>
          </div>
        </div>

        <!-- Error message -->
        <div v-if="error" class="mb-4 text-center text-red-500">
          {{ error.message }}
        </div>

        <!-- Upload Progress Indicator -->
        <div v-if="isUploadingFile" class="mb-4 flex justify-start">
          <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center mr-2 overflow-hidden">
            <div class="x-mask w-12 h-12" aria-hidden="true"></div>
          </div>
          <div class="inline-block py-2 px-3 rounded-lg max-w-[65%] bg-secondary-200 dark:bg-secondary-700 text-primary-500">
            <div class="flex items-center">
              <div class="blinking-cursor w-3 h-6 bg-primary-500"></div>
            </div>
          </div>
        </div>

        <!-- Spacer to ensure last message is visible above input -->
        <div class="h-4"></div>
      </div>

      <!-- Input area -->
      <div class="flex-shrink-0 bg-white dark:bg-secondary-900">
        <form
          @submit.prevent="handleSubmit"
          class="flex flex-col space-y-3 bg-transparent dark:bg-transparent dark:text-white border-4 border-primary-500 p-4"
        >
          <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden" />

          <div class="relative">
            <textarea
              v-model="inputProxy"
              @keydown.enter.exact.prevent="handleSubmit"
              @keydown.enter.shift.exact="handleShiftEnter"
              @focus="initializeChat"
              :placeholder="isTranscribing ? 'Transcribing…' : 'Type your message...'"
              class="bg-transparent dark:text-white w-full resize-none min-h-[120px] text-base border-0 focus:outline-none focus:ring-0"
              :disabled="isLoading"
              rows="4"
              ref="messageInput"
            />

          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <button
                type="button"
                @click="onRecordClick"
                :disabled="isLoading || isUploadingFile || isTranscribing"
                :class="[actionButtonClass, isRecording ? 'bg-red-500 text-white' : '']"
                aria-label="Record a voice memo"
              >
                <div :class="isRecording ? 'stop-icon-mask w-5 h-5' : 'record-icon-mask w-5 h-5'" aria-hidden="true"></div>
                <span>{{ isRecording ? 'Stop' : 'Record' }}</span>
              </button>

              <button
                type="button"
                @click="triggerFileUpload"
                :disabled="isLoading || isUploadingFile || isRecording || isTranscribing"
                :class="actionButtonClass"
                aria-label="Upload a file"
              >
                <div class="upload-icon-mask w-5 h-5" aria-hidden="true"></div>
                <span>Attach</span>
              </button>
            </div>

            <button type="submit" :class="actionButtonClass" :disabled="isLoading || !canSubmit || isTranscribing">
              <div class="send-icon-mask w-5 h-5" aria-hidden="true"></div>
            </button>
          </div>
        </form>
        <p v-if="uploadError" class="text-xs text-red-500 mt-1 pl-2">
          {{ uploadError }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChat } from "~/composables/useChat";
import {
  onMounted,
  onUnmounted,
  ref,
  watch,
  nextTick,
  computed,
  defineExpose,
} from "vue";
import { useTrainingProgress } from "~/composables/useTrainingProgress";
import { useDynamicColors } from "~/composables/useDynamicColors";
import { useUpgradeModal } from "~/composables/useUpgradeModal";

// Props
interface Props {
  embedded?: boolean;
  sparkId?: string; // When provided, runs in spark chat mode (no tools, spark system prompt)
  maxUserMessages?: number; // Optional cap for user messages (e.g., premium sparks)
}

const props = withDefaults(defineProps<Props>(), {
  embedded: false,
  sparkId: undefined,
  maxUserMessages: undefined,
});

const {
  messages,
  handleSubmit: originalHandleSubmit,
  isLoading,
  error,
  // Voice functionality from composable
  isRecording,
  isTTSEnabled,
  toggleTTS,
  startRecording,
  stopRecording,
  loadSession,
  getInitialMessage,
  currentSessionId,
  transcriptDraft,
} = useChat({ mode: props.sparkId ? 'spark' : 'default', sparkId: props.sparkId });

// Dynamic colors
const { primaryColor, secondaryColor } = useDynamicColors();
const { openUpgradeModal } = useUpgradeModal();

// Training progress (scoped to spark if provided)
const { progressPercent } = useTrainingProgress(computed(() => props.sparkId))
const displayPercent = computed(() => String(progressPercent.value).padStart(2, '0'))

// State to track if initial message has been sent
const hasInitialized = ref(false);

const inputValue = ref("");
const chatContainer = ref<HTMLElement | null>(null);
const isTranscribing = ref(false);

// File upload state
const fileInput = ref<HTMLInputElement | null>(null);
const isUploadingFile = ref(false);
const uploadError = ref<string | null>(null);

// Intersection observer for embedded chat
const chatObserver = ref<IntersectionObserver | null>(null);

// Filter out system messages and technical user messages for display
const displayMessages = computed(() => {
  return messages.value.filter((msg, index, array) => {
    if (msg.role === "system") return false;
    if (isLoading.value && msg.role === "user" && index === array.length - 1)
      return false;
    if (msg.role === "user" && typeof msg.content === "string") {
      if (
        msg.content.startsWith(
          "I have uploaded a file. Please use the documentProcessing tool"
        )
      )
        return false;
      if (
        msg.content.trim() ===
        "The user has uploaded a document. Please analyze it thoroughly and be prepared to answer questions about it."
      )
        return false;
    }
    return true;
  });
});

// Count user-authored messages in this chat session
const userMessageCount = computed(() =>
  messages.value.reduce((count, m) => (m.role === 'user' ? count + 1 : count), 0)
);

// Shared button styles for attach and send
const actionButtonClass = computed(() =>
  props.embedded
    ? "inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary-500 text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed space-x-2"
    : "inline-flex items-center justify-center h-10 px-4 rounded-lg text-secondary-600 dark:text-secondary-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed space-x-2"
);

// Decide whether to show the assistant avatar next to a message
const shouldShowAssistantAvatar = (message: { role: string }, index: number) => {
  if (message.role === "user") return false;
  if (isLoading.value) {
    for (let i = displayMessages.value.length - 1; i >= 0; i--) {
      const msg = displayMessages.value[i] as any;
      if (msg && msg.role === "assistant") {
        return index !== i;
      }
    }
  }
  return true;
};

// File upload functions
const triggerFileUpload = () => {
  fileInput.value?.click();
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  isUploadingFile.value = true;
  uploadError.value = null;

  // Safety timeout to reset upload state if it gets stuck
  const uploadTimeout = setTimeout(() => {
    if (isUploadingFile.value) {
      console.warn("Upload timeout - resetting upload state");
      isUploadingFile.value = false;
      uploadError.value = "Upload timed out. Please try again.";
    }
  }, 120000); // 2 minute safety timeout

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await $fetch<{ url: string }>("/api/upload/temp", {
      method: "POST",
      body: formData,
      timeout: 30000, // 30 second timeout
    });

    // Add a user message showing the file was uploaded
    messages.value.push({
      role: "user",
      content: `📎 Uploaded: ${file.name}`,
    });
    scrollToBottom();

    // Process the file in the background
    try {
      const userMessageForAI = `I have uploaded a file. Please use the documentProcessing tool to analyze this file: ${response.url}. The context is: user uploaded creative work or portfolio materials.`;
      await originalHandleSubmit(userMessageForAI, true);
    } catch (messageError) {
      console.error("Error processing uploaded file:", messageError);
      messages.value.push({
        role: "assistant",
        content: `I received your file "${file.name}" but had trouble processing it. You can still ask me questions about it or describe what it contains.`,
      });
      scrollToBottom();
    }
  } catch (e: any) {
    console.error("Upload error:", e);
    uploadError.value =
      e.data?.message || e.message || "The file could not be uploaded. Please try again.";
  } finally {
    clearTimeout(uploadTimeout);
    isUploadingFile.value = false;
    if (target) target.value = "";
  }
};

// Auto-scroll to bottom function
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTo({
        top: chatContainer.value.scrollHeight,
        behavior: "smooth",
      });
    }
  });
};

// Add these computed helpers below your existing computed:
const inputProxy = computed({
  get: () => (transcriptDraft.value ? transcriptDraft.value : inputValue.value),
  set: (val: string) => {
    if (transcriptDraft.value) transcriptDraft.value = val;
    else inputValue.value = val;
  },
});

const canSubmit = computed(() => {
  const draft = transcriptDraft.value?.trim();
  const typed = inputValue.value?.trim();
  const hasText = Boolean((draft && draft.length > 0) || (typed && typed.length > 0));
  if (!hasText) return false;
  if (props.maxUserMessages !== undefined && userMessageCount.value >= props.maxUserMessages) return false;
  return true;
});

// Submit handler
const handleSubmit = async (e: Event) => {
  e.preventDefault();
  if (props.maxUserMessages !== undefined && userMessageCount.value >= props.maxUserMessages) {
    openUpgradeModal({
      title: 'Message Limit Reached',
      message: `You can send up to ${props.maxUserMessages} messages to this premium spark on your current plan. Upgrade to continue the conversation.`,
    });
    return;
  }
  const draft = transcriptDraft.value?.trim();
  const typed = inputValue.value?.trim();
  const userMessage = draft && draft.length > 0 ? draft : typed;
  if (!userMessage) return;

  if (draft && draft.length > 0) {
    transcriptDraft.value = '';
  } else {
    inputValue.value = '';
  }

  originalHandleSubmit(userMessage);
};

// Handle Shift+Enter for new lines
const handleShiftEnter = (e: Event) => {
  e.preventDefault();
  const textarea = e.target as HTMLTextAreaElement;
  const cursorPosition = textarea.selectionStart;
  const textBeforeCursor = textarea.value.substring(0, cursorPosition);
  const textAfterCursor = textarea.value.substring(cursorPosition);

  textarea.value = textBeforeCursor + "\n" + textAfterCursor;

  nextTick(() => {
    textarea.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
    autoResizeTextarea();
  });
};

// Auto-resize textarea based on content
const messageInput = ref<HTMLTextAreaElement | null>(null);
const autoResizeTextarea = () => {
  if (messageInput.value) {
    messageInput.value.style.height = "auto";
    messageInput.value.style.height =
      Math.min(messageInput.value.scrollHeight, 200) + "px";
  }
};

// Watch input value to auto-resize
watch(inputValue, () => {
  nextTick(() => {
    autoResizeTextarea();
  });
  
  // If user starts typing manually while transcribing, cancel transcription
  if (isTranscribing.value && inputValue.value.trim().length > 0) {
    isTranscribing.value = false;
    if (transcriptDraft.value) {
      transcriptDraft.value = '';
    }
  }
});

// Watch for changes that should trigger scrolling
watch(
  messages,
  () => {
    scrollToBottom();
  },
  { deep: true, immediate: true }
);

// Function to initialize chat when it becomes visible
const initializeChat = () => {
  if (!hasInitialized.value && messages.value.length === 0) {
    hasInitialized.value = true;
    getInitialMessage();
    scrollToBottom();
  }
};

// Cleanup function
function cleanup() {
  if (isLoading.value) isLoading.value = false;
  isUploadingFile.value = false;
  uploadError.value = null;
}


// Toggle transcribing indicator around stop/start
const onRecordClick = async () => {
  if (isRecording.value) {
    stopRecording();
    isTranscribing.value = true; // show while waiting for STT
    
    // Safety timeout: if transcription takes too long or fails, reset state
    setTimeout(() => {
      if (isTranscribing.value && (!transcriptDraft.value || transcriptDraft.value.trim().length === 0)) {
        isTranscribing.value = false;
        if (transcriptDraft.value) {
          transcriptDraft.value = '';
        }
      }
    }, 10000); // 10 second timeout
  } else {
    isTranscribing.value = false;
    await startRecording();
  }
};

// Hide indicator when transcript text arrives/changes
watch(transcriptDraft, (newTranscript) => {
  // If transcript is empty or too short, cancel transcription and allow user to type again
  if (!newTranscript || newTranscript.trim().length === 0) {
    isTranscribing.value = false;
    // Clear any empty transcript draft
    if (transcriptDraft.value) {
      transcriptDraft.value = '';
    }
  } else {
    isTranscribing.value = false;
  }
});

defineExpose({ cleanup, loadSession });


onMounted(async () => {
  await nextTick();

  if (!props.embedded) {
    initializeChat();
    return;
  }

  // For embedded chat, set up intersection observer
  const setupObserver = () => {
    if (chatContainer.value) {
      chatObserver.value = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0) {
              initializeChat();
            }
          });
        },
        { threshold: 0.1 }
      );

      chatObserver.value.observe(chatContainer.value);
    } else {
      setTimeout(setupObserver, 100);
    }
  };

  setupObserver();
});

// Clean up observer on unmount
onUnmounted(() => {
  if (chatObserver.value) {
    chatObserver.value.disconnect();
  }
});
</script>

<style scoped>
.blinking-cursor {
  animation: blink 0.7s infinite;
  margin: 0.25rem;
  height: calc(3rem - 0.5rem); /* 48px - 8px (top + bottom margins) = 40px */
}

button {
  hyphens: none;
  -webkit-hyphens: none;
  -ms-hyphens: none;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

input:disabled,
button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.x-mask {
  background-color: hsl(var(--color-primary-500));
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
  margin: 0.25rem;
}

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
</style>
