/**
 * sms-gateway/src/rateLimiter.js
 *
 * Sliding-window rate limiter per sender phone number to protect telecom gateway quotas
 * (Ethio Telecom / Safaricom Ethiopia) and prevent SMS spam.
 */

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 SMS requests per minute per phone number

// In-memory sliding window store: sender -> array of timestamps
const requestTimestamps = new Map();

/**
 * Checks whether an incoming SMS from a sender phone number is allowed or rate-limited.
 * Returns { allowed: boolean, remaining: number, retryAfterSec: number }
 */
function checkRateLimit(sender) {
  if (!sender)
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW,
      retryAfterSec: 0,
    };

  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Retrieve previous timestamps for sender
  let timestamps = requestTimestamps.get(sender) || [];

  // Filter out timestamps outside the sliding window
  timestamps = timestamps.filter((ts) => ts > windowStart);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestInWindow = timestamps[0];
    const retryAfterSec = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: retryAfterSec > 0 ? retryAfterSec : 1,
    };
  }

  // Record current timestamp
  timestamps.push(now);
  requestTimestamps.set(sender, timestamps);

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - timestamps.length,
    retryAfterSec: 0,
  };
}

module.exports = { checkRateLimit, MAX_REQUESTS_PER_WINDOW, WINDOW_MS };
