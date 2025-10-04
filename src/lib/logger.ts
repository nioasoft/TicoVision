/**
 * Structured logger with environment awareness and data sanitization
 * Replaces console.log usage to prevent sensitive data exposure
 *
 * Features:
 * - Environment-based logging (dev vs production)
 * - Automatic sensitive data sanitization
 * - Structured context support
 * - Integration-ready for Sentry/DataDog
 */

// Sensitive keys that should be redacted from logs
const SENSITIVE_KEYS = [
  'password',
  'password_hash',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'secret',
  'credit_card',
  'ssn',
  'tax_id', // Israeli tax ID
  'encrypted_password',
  'recovery_token',
  'confirmation_token',
];

// Type for log context
export type LogContext = Record<string, unknown>;

/**
 * Sanitize sensitive data from log context
 */
function sanitize(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact long tokens/hashes (>20 chars alphanumeric)
    if (data.length > 20 && /^[a-zA-Z0-9-_]+$/.test(data)) {
      return `[REDACTED:${data.substring(0, 4)}...${data.substring(data.length - 4)}]`;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();

      // Check if key contains sensitive information
      const isSensitive = SENSITIVE_KEYS.some(sensitiveKey =>
        lowerKey.includes(sensitiveKey)
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitize(value);
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Format log message with context
 */
function formatLog(level: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const sanitizedContext = context ? sanitize(context) : {};

  return JSON.stringify({
    timestamp,
    level,
    message,
    ...(Object.keys(sanitizedContext).length > 0 && { context: sanitizedContext }),
  });
}

/**
 * Send log to external service (Sentry, DataDog, etc.)
 * Only in production
 */
function sendToExternalService(_level: string, _message: string, _context?: LogContext) {
  if (import.meta.env.PROD) {
    // TODO: Integrate with Sentry/DataDog
    // Example: Sentry.captureMessage(_message, { level: _level, extra: _context });
  }
}

/**
 * Structured logger
 */
export const logger = {
  /**
   * Debug level - only in development
   */
  debug: (message: string, context?: LogContext) => {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, context ? sanitize(context) : '');
    }
  },

  /**
   * Info level - normal operation logs
   */
  info: (message: string, context?: LogContext) => {
    if (import.meta.env.DEV) {
      console.info(`[INFO] ${message}`, context ? sanitize(context) : '');
    } else {
      // In production, use structured logging
      const formatted = formatLog('info', message, context);
      console.info(formatted);
    }
    sendToExternalService('info', message, context);
  },

  /**
   * Warning level - potential issues
   */
  warn: (message: string, context?: LogContext) => {
    const sanitized = context ? sanitize(context) : undefined;

    if (import.meta.env.DEV) {
      console.warn(`[WARN] ${message}`, sanitized || '');
    } else {
      const formatted = formatLog('warning', message, context);
      console.warn(formatted);
    }
    sendToExternalService('warning', message, context);
  },

  /**
   * Error level - critical issues
   */
  error: (message: string, error?: unknown, context?: LogContext) => {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: import.meta.env.DEV ? error.stack : '[REDACTED]',
      } : error,
    };

    const sanitized = sanitize(errorContext);

    if (import.meta.env.DEV) {
      console.error(`[ERROR] ${message}`, sanitized);
    } else {
      const formatted = formatLog('error', message, errorContext);
      console.error(formatted);
    }
    sendToExternalService('error', message, errorContext);
  },
};

/**
 * Export type for external use
 */
export type Logger = typeof logger;
