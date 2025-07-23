import Bottleneck from "bottleneck";

// Create a limiter for Google API
const googleLimiter = new Bottleneck({
  maxConcurrent: 1, // Max 2 requests running at the same time
  minTime: 2000, // Min 2 second between requests
  highWater: 50, // Max 100 jobs queued
  strategy: "LEAK", // Strategy for when queue is full (as string, not enum)
  retryCount: 10, // Auto-retry on failure
  // Custom retry strategy for Google API rate limits
  retryCondition: (error) =>
    error?.code === 429 ||
    error?.message?.includes("rate limit") ||
    error?.message?.includes("quota") ||
    error?.message?.includes("Quoat exceeded"),

  maxRetryAfter: 60 * 1000,
});

// Export the limiter for use in other files
export default googleLimiter;
