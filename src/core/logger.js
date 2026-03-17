/**
 * Logging utility with level control for Voxx-JS
 * Respects LOG_LEVEL environment variable (DEBUG, INFO, WARN, ERROR, NONE)
 */

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 };

// Get level from environment or default to INFO
const getLevel = () => {
  const envLevel = typeof process !== 'undefined' && process.env?.LOG_LEVEL?.toUpperCase();
  return LOG_LEVELS[envLevel] ?? LOG_LEVELS.INFO;
};

let currentLevel = getLevel();

export const logger = {
  debug: (msg, ...args) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.debug(`[DEBUG] ${msg}`, ...args);
    }
  },
  info: (msg, ...args) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.info(`[INFO] ${msg}`, ...args);
    }
  },
  warn: (msg, ...args) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${msg}`, ...args);
    }
  },
  error: (msg, ...args) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(`[ERROR] ${msg}`, ...args);
    }
  },
  setLevel: (level) => {
    // Runtime level change for testing
    currentLevel = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
  }
};

export { LOG_LEVELS };
