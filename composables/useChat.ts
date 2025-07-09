import { ref } from 'vue';
import { type CoreMessage } from 'ai';

export const useChat = () => {
  const messages = ref<CoreMessage[]>([]);
  const isLoading = ref(false);
  const error = ref<any>(null);

  const sendMessage = async (newMessages: CoreMessage[]) => {
    isLoading.value = true;
    error.value = null;

    // Add a placeholder for the assistant's response
    if (newMessages.some(m => m.role === 'user')) {
        messages.value.push({ role: 'assistant', content: '' });
    }

    try {
      // Filter out any messages that might have empty content before sending.
      const messagesToSend = newMessages.filter(m => {
        if (typeof m.content === 'string') {
          return m.content.trim() !== '';
        }
        // Keep non-string content blocks, assuming they are valid (e.g., for multi-modal input in the future)
        return true;
      });

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { content } = await response.json();
      
      // Update the last assistant message with the actual content
      const lastMessage = messages.value[messages.value.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content = content;
      } else {
        // This case handles the initial message where there's no user message yet
        messages.value.push({ role: 'assistant', content });
      }

    } catch (e) {
      error.value = e;
      const lastMessage = messages.value[messages.value.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = 'Sorry, I ran into an error.';
      }
    } finally {
      isLoading.value = false;
    }
  };

  const getInitialMessage = async () => {
     messages.value = []; // Reset messages for a new chat
     const initialPrompt: CoreMessage[] = [
      { 
        role: 'user', 
        content: 'Welcome the user back. Your main goal is to guide them through their training. Determine the next single most important question they should answer from any module. Ask them this question directly and concisely. Do not start with a progress summary. Just ask the question.' 
      }
    ];
    // We don't push the user message to the history here, just send it.
    await sendMessage(initialPrompt);
  };
  
  const handleSubmit = async (userInput: string) => {
    if (!userInput || !userInput.trim()) return;

    const userMessage: CoreMessage = { role: 'user', content: userInput };
    messages.value.push(userMessage);

    await sendMessage(messages.value);
  };

  return {
    messages,
    handleSubmit,
    isLoading,
    error,
    getInitialMessage
  };
}; 