class RetryService {
  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 30000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  // Execute a function with retry logic
  async executeWithRetry(operation, operationName, context = {}) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`${operationName} - Attempt ${attempt}/${this.maxRetries}`);
        const result = await operation();

        if (attempt > 1) {
          console.log(`${operationName} - Succeeded on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error;
        console.error(`${operationName} - Attempt ${attempt} failed:`, error.message);

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          console.log(`${operationName} - Non-retryable error, giving up`);
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === this.maxRetries) {
          console.error(`${operationName} - All ${this.maxRetries} attempts failed`);
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(this.baseDelay * Math.pow(2, attempt - 1), this.maxDelay);
        console.log(`${operationName} - Retrying in ${delay}ms...`);

        await this.sleep(delay);
      }
    }

    // All retries exhausted
    throw new Error(`${operationName} failed after ${this.maxRetries} attempts. Last error: ${lastError.message}`);
  }

  // Check if error is non-retryable
  isNonRetryableError(error) {
    // Authentication errors
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      return true;
    }

    // Bad request (malformed data)
    if (error.response && error.response.status === 400) {
      return true;
    }

    // Not found errors
    if (error.response && error.response.status === 404) {
      return true;
    }

    // Rate limiting (should retry with backoff, but may need different handling)
    if (error.response && error.response.status === 429) {
      return false; // Allow retry for rate limits
    }

    return false;
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Create retry service with custom config
  static create(config = {}) {
    return new RetryService(
      config.maxRetries || 3,
      config.baseDelay || 1000,
      config.maxDelay || 30000
    );
  }
}

module.exports = RetryService;