export const JOB_TYPE_DIAGNOSTICS = 'diagnostics.ping';

export const DEFAULT_MAX_ATTEMPTS = 3;

/** Base retry delay in seconds; multiplied by attempt number (bounded). */
export const RETRY_BASE_DELAY_SECONDS = 5;

export const RETRY_MAX_DELAY_SECONDS = 60;
