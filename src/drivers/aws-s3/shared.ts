/**
 * @deprecated This file is deprecated and will be removed in a future major version.
 * Please import from the specific shared files:
 * - shared-public.js - Public utilities for custom mapping
 * - shared-deprecated.js - Deprecated functions (backward compatibility)
 * - shared-native.js - Native driver factory (internal)
 * - shared-internal.js - Internal utilities (internal)
 * 
 * This file exists only for backward compatibility during migration.
 */

// Re-export everything from the new modular files
export * from './shared-public.js';
export * from './shared-deprecated.js';
export { nativeDriverAWS } from './shared-native.js';
export { getS3Head } from './shared-internal.js';
