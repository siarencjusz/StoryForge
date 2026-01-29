/**
 * Token counting utilities
 *
 * Since we don't have access to the actual LLM tokenizer, we use a reasonable
 * approximation based on GPT-like tokenization rules:
 * - ~4 characters per token on average for English text
 * - Words, punctuation, and whitespace are typically separate tokens
 */

/**
 * Estimate token count for a string
 * Uses a simple heuristic: ~4 characters per token, with adjustments for
 * whitespace, punctuation, and common patterns
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Simple approximation: split on whitespace and punctuation
  // Count words and punctuation marks separately
  const words = text.match(/\b\w+\b/g) || [];
  const punctuation = text.match(/[^\w\s]/g) || [];
  const newlines = text.match(/\n/g) || [];

  // Estimate:
  // - Average word is ~1.3 tokens (some words split into subwords)
  // - Each punctuation mark is ~1 token
  // - Newlines are ~1 token
  const wordTokens = words.reduce((sum, word) => {
    // Longer words are more likely to be split
    if (word.length <= 4) return sum + 1;
    if (word.length <= 8) return sum + 1.3;
    return sum + Math.ceil(word.length / 4);
  }, 0);

  return Math.ceil(wordTokens + punctuation.length + newlines.length);
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}
