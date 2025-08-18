/**
 * Unified markdown interpreter for consistent rendering across components
 */

export function renderMarkdown(content: string): string {
  if (!content || typeof content !== 'string') return '';
  
  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-3 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-base font-semibold mt-3 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-sm font-semibold mt-2 mb-1">$1</h1>')
    
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/__(.*?)__/g, '<strong class="font-semibold">$1</strong>')
    
    // Italic text
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
    
    // Strikethrough text
    .replace(/~~(.*?)~~/g, '<del class="line-through text-gray-500">$1</del>')
    
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg overflow-x-auto my-2 border border-gray-200 dark:border-gray-700"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">$1</code>')
    
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-3 my-2 italic text-gray-600 dark:text-gray-400">$1</blockquote>')
    
    // Tables - simple table support
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
      if (cells.length > 0) {
        // Check if this looks like a header row (contains --- or similar)
        const isHeader = cells.some((cell: string) => /^[-:]+$/.test(cell));
        if (isHeader) {
          return ''; // Skip separator rows
        }
        return `<tr>${cells.map((cell: string) => `<td class="border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-gray-700 dark:text-gray-300">${cell}</td>`).join('')}</tr>`;
      }
      return match;
    })
    .replace(/(<tr>.*<\/tr>)/gs, (match: string, rows: string) => {
      if (rows.trim()) {
        return `<table class="border-collapse border border-gray-300 dark:border-gray-600 my-3 w-full"><tbody>${rows}</tbody></table>`;
      }
      return '';
    })
    
    // Lists - handle both unordered and ordered lists
    .replace(/^(\s*)[*\-] (.*$)/gim, (match: string, spaces: string, content: string) => {
      const indent = spaces.length;
      return `<li class="ml-${Math.max(4, indent + 4)} my-1">${content}</li>`;
    })
    .replace(/^(\s*)(\d+)\. (.*$)/gim, (match: string, spaces: string, number: string, content: string) => {
      const indent = spaces.length;
      return `<li class="ml-${Math.max(4, indent + 4)} my-1">${number}. ${content}</li>`;
    })
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="my-3 border-gray-300 dark:border-gray-600">')
    
    // Line breaks and paragraphs
    .replace(/\n\n+/g, '</p><p class="my-1.5 text-gray-700 dark:text-gray-300">')
    .replace(/\n/g, '<br>')
    
    // Wrap in paragraph tags, but preserve existing HTML elements
    .replace(/^([^<].+)$/gm, '<p class="my-1.5 text-gray-700 dark:text-gray-300">$1</p>')
    .replace(/<p class="my-1.5 text-gray-700 dark:text-gray-300"><\/p>/g, '') // Remove empty paragraphs
    .replace(/^<p class="my-1.5 text-gray-700 dark:text-gray-300">(.+)<\/p>$/s, '$1'); // Remove outer wrapper if only one paragraph
}

/**
 * CSS classes for markdown content styling
 */
export const markdownStyles = `
.markdown-content {
  line-height: 1.6;
}

.markdown-content :deep(h1) {
  @apply text-lg font-semibold mt-3 mb-2 text-gray-900 dark:text-white;
}

.markdown-content :deep(h2) {
  @apply text-base font-semibold mt-3 mb-2 text-gray-900 dark:text-white;
}

.markdown-content :deep(h3) {
  @apply text-sm font-semibold mt-2 mb-1 text-gray-900 dark:text-white;
}

.markdown-content :deep(p) {
  @apply my-1.5 text-gray-700 dark:text-gray-300 text-base;
}

.markdown-content :deep(strong) {
  @apply font-semibold text-gray-900 dark:text-white;
}

.markdown-content :deep(em) {
  @apply italic text-gray-800 dark:text-gray-200;
}

.markdown-content :deep(del) {
  @apply line-through text-gray-500;
}

.markdown-content :deep(code:not(pre code)) {
  @apply bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200;
}

.markdown-content :deep(pre) {
  @apply bg-gray-100 dark:bg-gray-800 p-2 rounded-lg overflow-x-auto my-2 border border-gray-200 dark:border-gray-700;
}

.markdown-content :deep(pre code) {
  @apply bg-transparent p-0 text-sm text-gray-800 dark:text-gray-200;
}

.markdown-content :deep(ul) {
  @apply list-disc ml-4 my-1.5 space-y-0.5;
}

.markdown-content :deep(ol) {
  @apply list-decimal ml-4 my-1.5 space-y-0.5;
}

.markdown-content :deep(li) {
  @apply my-0.5 text-gray-700 dark:text-gray-300;
}

.markdown-content :deep(a) {
  @apply text-blue-600 dark:text-blue-400 hover:underline;
}

.markdown-content :deep(blockquote) {
  @apply border-l-4 border-gray-300 dark:border-gray-600 pl-3 my-2 italic text-gray-600 dark:text-gray-400;
}

.markdown-content :deep(hr) {
  @apply my-3 border-gray-300 dark:border-gray-600;
}

.markdown-content :deep(table) {
  @apply border-collapse border border-gray-300 dark:border-gray-600 my-3 w-full;
}

.markdown-content :deep(td) {
  @apply border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-gray-700 dark:text-gray-300 text-sm;
}

.markdown-content :deep(th) {
  @apply border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-gray-900 dark:text-white font-semibold bg-gray-50 dark:bg-gray-800 text-sm;
}

/* Ensure proper spacing for embedded mode */
.markdown-content :deep(*) {
  @apply leading-relaxed;
}
`
