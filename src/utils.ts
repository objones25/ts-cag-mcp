/**
 * Formats a prompt for asking questions about content
 */
export function formatContentQuery(content: string, question: string): string {
  return `Given this content:
${content}

Answer this question: ${question}`;
} 