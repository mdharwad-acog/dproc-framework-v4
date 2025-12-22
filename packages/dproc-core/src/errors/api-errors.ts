import { DProcError } from "./base.js";

/**
 * Helper to get provider documentation URL
 */
function getProviderUrl(provider: string): string {
  const urls: Record<string, string> = {
    openai: "https://platform.openai.com/api-keys",
    anthropic: "https://console.anthropic.com/settings/keys",
    google: "https://aistudio.google.com/app/apikey",
  };
  return urls[provider.toLowerCase()] || "your provider dashboard";
}

/**
 * Error thrown when API key is missing
 */
export class APIKeyMissingError extends DProcError {
  constructor(provider: "openai" | "anthropic" | "google") {
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

    super({
      code: "API_KEY_MISSING",
      message: `${providerName} API key is missing`,
      userMessage: `${providerName} API key is missing\n\nThis pipeline requires ${providerName} to generate reports.`,
      fixes: [
        `Get your API key from ${getProviderUrl(provider)}`,
        "Add it in Settings → API Keys (Web UI)",
        `Or run: dproc config set ${provider.toUpperCase()}_API_KEY "your-key"`,
        "Then try executing again",
      ],
      severity: "error",
      context: { provider },
    });
  }
}

/**
 * Error thrown when API key is invalid
 */
export class APIKeyInvalidError extends DProcError {
  constructor(provider: string, statusCode?: number) {
    super({
      code: "API_KEY_INVALID",
      message: `${provider} API key is invalid`,
      userMessage: `${provider} API key is invalid\n\nThe API rejected your key. It may be expired or incorrect.`,
      fixes: [
        `Generate a new key at ${getProviderUrl(provider)}`,
        "Update your key in Settings → API Keys",
        "Make sure you copied the entire key correctly",
        "Check that the key hasn't been revoked",
      ],
      severity: "error",
      context: {
        provider,
        statusCode,
      },
    });
  }
}

/**
 * Error thrown when API rate limit is exceeded
 */
export class RateLimitError extends DProcError {
  constructor(provider: string, retryAfter?: number) {
    const waitTime = retryAfter || 60;
    const minutes = Math.ceil(waitTime / 60);

    super({
      code: "RATE_LIMIT_EXCEEDED",
      message: `${provider} API rate limit exceeded`,
      userMessage: `Rate limit reached\n\nYou've hit the rate limit for ${provider} API.`,
      fixes: [
        `Wait ${minutes} minute${minutes > 1 ? "s" : ""} and try again`,
        "Or upgrade your API plan for higher limits",
        `Check your quota at ${getProviderUrl(provider)}`,
      ],
      severity: "warning",
      context: {
        provider,
        retryAfter: waitTime,
      },
    });
  }
}

/**
 * Error thrown when API quota is exceeded
 */
export class QuotaExceededError extends DProcError {
  constructor(provider: string, resetDate?: Date) {
    const resetInfo = resetDate
      ? `Resets on ${resetDate.toLocaleDateString()}`
      : "Check your dashboard for reset date";

    super({
      code: "QUOTA_EXCEEDED",
      message: `${provider} API quota exceeded`,
      userMessage: `API quota exceeded\n\nYou've used all your ${provider} API quota for this period.`,
      fixes: [
        resetInfo,
        "Upgrade your plan for more quota",
        `Visit ${getProviderUrl(provider)} to manage your plan`,
      ],
      severity: "error",
      context: {
        provider,
        resetDate: resetDate?.toISOString(),
      },
    });
  }
}

/**
 * Error thrown when API request times out
 */
export class APITimeoutError extends DProcError {
  constructor(provider: string, timeoutMs: number) {
    const seconds = Math.round(timeoutMs / 1000);

    super({
      code: "API_TIMEOUT",
      message: `${provider} API request timed out after ${seconds}s`,
      userMessage: `Request timed out\n\nThe ${provider} API didn't respond within ${seconds} seconds.`,
      fixes: [
        "Check your internet connection",
        "Try again in a moment",
        "The API may be experiencing delays",
        `Check API status at ${getProviderUrl(provider)}`,
      ],
      severity: "warning",
      context: {
        provider,
        timeoutMs,
      },
    });
  }
}

/**
 * Error thrown when API returns an error response
 */
export class APIResponseError extends DProcError {
  constructor(provider: string, statusCode: number, errorMessage: string) {
    super({
      code: "API_RESPONSE_ERROR",
      message: `${provider} API returned error ${statusCode}: ${errorMessage}`,
      userMessage: `API request failed\n\n${provider} returned an error: ${errorMessage}`,
      fixes: [
        "Check the error message above for details",
        "Verify your API key is valid",
        "Check your API quota and limits",
        "If the problem persists, contact support",
      ],
      severity: "error",
      context: {
        provider,
        statusCode,
        errorMessage,
      },
    });
  }
}
