/**
 * Utils index
 * 
 * Re-exports all utilities to maintain API compatibility.
 * All existing imports from './utils.js' will continue to work.
 */

// Common storage utilities
export {
  validateKey,
  validateBaseDriverOptions,
  filterKeyByDepth,
  filterKeyByDepthByOptions,
  clearByListingAndBatching
} from './common-storage.js';

// Common library utilities
export {
  serialize,
  deserialize,
  streamToString
} from './common-lib.js';

// Provider-specific utilities
export {
  validateAWSRegionAndCredentials
} from './provider-aws.js';

// Variant utilities (future - currently empty)
export * from './variant-flex.js';
export * from './variant-versioned.js';

