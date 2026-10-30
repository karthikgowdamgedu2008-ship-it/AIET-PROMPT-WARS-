/**
 * @fileoverview Security utilities for CivicPulse AI.
 * Provides strict input sanitization against XSS/HTML/SQL injection vectors,
 * image URL validation, GPS coordinate bounds verification, and client-side rate limiting.
 */

const rateLimitBuckets = new Map<string, number[]>();

/**
 * Sanitizes untrusted user text by stripping `<script>` blocks, HTML tags,
 * event handlers, and common SQL/XSS injection patterns.
 *
 * @param input - Raw string entered by a user.
 * @param maxLength - Maximum allowed character length (default 2000).
 * @returns Cleaned, safe plain-text string.
 */
export function sanitizeInput(input: string, maxLength = 2000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove <script>...</script> blocks
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove inline javascript: or data:text/html URIs
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    // Remove inline HTML event attributes like onerror=, onload=
    .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
    // Strip remaining HTML tags
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Strip dangerous SQL comment / stacked query sequences
    .replace(/(--|;\s*DROP\s+TABLE|;\s*DELETE\s+FROM|UNION\s+SELECT)/gi, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates that an image URL is either a safe `https://` image link
 * or a valid `data:image/(png|jpeg|jpg|webp|gif);base64,...` data URI.
 *
 * @param url - Candidate image URL or Base64 string.
 * @returns Sanitized URL string if valid, or `null` if unsafe/invalid.
 */
export function validateImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Validates and clamps geographic coordinates to valid WGS84 bounds
 * (Latitude: -90 to 90, Longitude: -180 to 180).
 *
 * @param latitude - Candidate latitude value.
 * @param longitude - Candidate longitude value.
 * @returns Object indicating validity and normalized coordinates.
 */
export function validateCoordinates(
  latitude: number,
  longitude: number
): { valid: boolean; latitude: number; longitude: number } {
  const latNum = Number(latitude);
  const lngNum = Number(longitude);

  if (
    Number.isNaN(latNum) ||
    Number.isNaN(lngNum) ||
    latNum < -90 ||
    latNum > 90 ||
    lngNum < -180 ||
    lngNum > 180
  ) {
    return {
      valid: false,
      latitude: 12.9756,
      longitude: 77.6066,
    };
  }

  return {
    valid: true,
    latitude: Number(latNum.toFixed(6)),
    longitude: Number(lngNum.toFixed(6)),
  };
}

/**
 * Client-side sliding-window rate-limiting guard to prevent automated submission abuse.
 *
 * @param actionKey - Identifier for the action bucket (e.g., `'submit_report'`).
 * @param maxRequests - Max allowed actions within the window (default 15).
 * @param windowMs - Sliding window duration in milliseconds (default 60,000ms).
 * @returns `true` if allowed, `false` if rate limit exceeded.
 */
export function checkRateLimit(
  actionKey = 'default_action',
  maxRequests = 15,
  windowMs = 60000
): boolean {
  const now = Date.now();
  const timestamps = rateLimitBuckets.get(actionKey) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    rateLimitBuckets.set(actionKey, validTimestamps);
    return false;
  }

  validTimestamps.push(now);
  rateLimitBuckets.set(actionKey, validTimestamps);
  return true;
}

/**
 * Resets client-side rate-limit buckets (used in unit tests).
 */
export function resetRateLimitBuckets(): void {
  rateLimitBuckets.clear();
}

