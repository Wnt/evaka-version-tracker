import axios from 'axios';

export class RateLimitError extends Error {
  constructor(
    message: string,
    public remaining: number,
    public resetTime: Date
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export function checkRateLimit(headers: Record<string, string>): void {
  const remaining = parseInt(headers['x-ratelimit-remaining'] || '', 10);
  const reset = parseInt(headers['x-ratelimit-reset'] || '', 10);

  if (!isNaN(remaining) && remaining <= 10) {
    const resetDate = new Date(reset * 1000);
    console.warn(
      `GitHub API rate limit warning: ${remaining} requests remaining. Resets at ${resetDate.toISOString()}`
    );
  }

  if (remaining === 0) {
    const resetDate = new Date(reset * 1000);
    throw new RateLimitError(
      `GitHub API rate limit exceeded. Resets at ${resetDate.toISOString()}`,
      remaining,
      resetDate
    );
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry rate limit errors
      if (error instanceof RateLimitError) {
        throw error;
      }

      // Don't retry on 4xx errors (except 429 rate limit)
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
      }

      if (attempt === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}
