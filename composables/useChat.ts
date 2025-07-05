import { ref } from 'vue';
import { type CoreMessage } from 'ai';

export const useChat = () => {
  const messages = ref<CoreMessage[]>([]);
  const input = ref('');
  const isLoading = ref(false);
  const error = ref<any>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!input.value.trim()) return;

    const userInput = input.value;
    messages.value.push({ role: 'user', content: userInput });
    
    input.value = '';
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.value,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      const assistantMessage: CoreMessage = { role: 'assistant', content: '' };
      messages.value.push(assistantMessage);
      const assistantMessageIndex = messages.value.length - 1;

      // More robust manual stream parser
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processBuffer = () => {
        // The stream protocol is `[type]:[data]\n`. Process buffer line by line.
        let eolIndex;
        while ((eolIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.substring(0, eolIndex).trim();
          buffer = buffer.substring(eolIndex + 1);

          if (line.startsWith('0:')) {
            try {
              const textContent = JSON.parse(line.substring(2));
              messages.value[assistantMessageIndex].content += textContent;
            } catch (e) {
              console.error("Failed to parse text chunk:", line, e);
            }
          } else if (line) {
             console.log("Received non-text data chunk:", line);
          }
        }
      };
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer) {
            processBuffer();
          }
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        processBuffer();
      }

    } catch (e) {
      error.value = e;
      const lastMessage = messages.value[messages.value.length - 1];
      if(lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content = 'Sorry, I ran into an error.';
      }
    } finally {
      isLoading.value = false;
    }
  };

  return {
    messages,
    input,
    handleSubmit,
    isLoading,
    error,
  };
}; 