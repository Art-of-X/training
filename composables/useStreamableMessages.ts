import { ref, watch, type Ref } from 'vue';

/**
 * A composable to manage and process a stream of Message parts.
 * It filters out non-content messages (like tool calls) and reconstructs
 * the assistant's response content.
 *
 * @param messages - A ref to an array of Message objects from the parent chat state.
 */
export const useStreamableMessages = (messages: Ref<any[]>) => {
  // A separate ref to hold only the messages that should be displayed in the UI.
  const displayMessages = ref<any[]>([]);

  const isMessageVisible = (message: any) => {
    // Do not display the initial user message that's used to kick off the conversation.
    if (message.id === 'initial') {
      return false;
    }

    // Display regular user messages.
    if (message.role === 'user') {
      return true;
    }
    
    // Display assistant messages only if they contain text content.
    if (message.role === 'assistant' && message.content?.length > 0) {
      return true;
    }

    // Hide assistant messages that are only for tool calls or have no content.
    return false;
  };

  // The function to process the raw messages and update the displayable ones.
  const processMessages = () => {
    // Re-filter and map the raw messages every time they change.
    displayMessages.value = messages.value.filter(isMessageVisible);
  };

  // Watch the source messages ref and re-process whenever it changes.
  watch(
    messages,
    () => {
      processMessages();
    },
    { deep: true, immediate: true }
  );

  return {
    displayMessages,
  };
}; 