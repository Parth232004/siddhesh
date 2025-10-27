class ErrorHandler {
  // Standardize error responses
  static createErrorResponse(service, operation, originalError, statusCode = 500) {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();

    // Log structured error
    console.error(JSON.stringify({
      errorId,
      timestamp,
      service,
      operation,
      statusCode,
      message: originalError.message,
      stack: originalError.stack,
      // Don't log sensitive data
      details: this.sanitizeErrorDetails(originalError)
    }));

    // Return user-friendly error response
    return {
      success: false,
      error: {
        id: errorId,
        message: this.getUserFriendlyMessage(service, operation, originalError),
        timestamp
      }
    };
  }

  // Generate unique error ID for tracking
  static generateErrorId() {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Sanitize error details to avoid exposing sensitive information
  static sanitizeErrorDetails(error) {
    if (!error) return null;

    // Remove sensitive information from error messages
    const sanitized = { ...error };
    delete sanitized.config;
    delete sanitized.request;
    delete sanitized.response;

    if (error.response && error.response.data) {
      // Keep only error message, remove tokens, keys, etc.
      sanitized.response = {
        status: error.response.status,
        statusText: error.response.statusText,
        message: error.response.data.message || error.response.data.error || 'API Error'
      };
    }

    return sanitized;
  }

  // Get user-friendly error messages
  static getUserFriendlyMessage(service, operation, error) {
    const serviceMessages = {
      email: {
        send: 'Failed to send email. Please try again later.',
        auth: 'Email service authentication failed.',
        network: 'Email service is temporarily unavailable.'
      },
      whatsapp: {
        send: 'Failed to send WhatsApp message. Please try again later.',
        auth: 'WhatsApp service authentication failed.',
        quota: 'WhatsApp messaging quota exceeded.'
      },
      telegram: {
        send: 'Failed to send Telegram message. Please try again later.',
        auth: 'Telegram bot authentication failed.',
        network: 'Telegram service is temporarily unavailable.'
      },
      sms: {
        send: 'Failed to send SMS. Please try again later.',
        auth: 'SMS service authentication failed.',
        quota: 'SMS quota exceeded.'
      }
    };

    const messages = serviceMessages[service] || {};
    const operationMessages = messages[operation] || messages.send;

    if (operationMessages) {
      return operationMessages;
    }

    // Fallback generic message
    return `${service.charAt(0).toUpperCase() + service.slice(1)} service error. Please try again later.`;
  }

  // Handle service-specific errors
  static handleServiceError(service, operation, error) {
    // Check for specific error types
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return this.createErrorResponse(service, 'network', error, 503);
    }

    if (error.response && error.response.status === 401) {
      return this.createErrorResponse(service, 'auth', error, 500);
    }

    if (error.response && error.response.status === 429) {
      return this.createErrorResponse(service, 'quota', error, 429);
    }

    // Default error handling
    return this.createErrorResponse(service, operation, error);
  }
}

module.exports = ErrorHandler;