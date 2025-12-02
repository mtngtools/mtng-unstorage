/**
 * Types index
 * 
 * Re-exports all types to maintain API compatibility.
 * All existing imports from './types.js' will continue to work.
 */

// Generic TypeScript helpers
export type {
  Prettify,
  BooleanValue
} from './helpers.js';

// AWS provider-specific types
export type {
  AwsRegionAndCredentials
} from './provider-aws.js';

// Base driver types
export type {
  MTBaseDriverOptions,
  ResolvedMTBaseDriverOptions,
  MTBaseDriverRequestOptions,
  MTBaseDriverTransactionOptions,
  BaseDriverMethods,
  ConditionalDriver,
  ReadOnlyDriver,
  WritableDriver,
  WritableDriverWithoutClear,
  DriverFactory,
  MTDriverType
} from './driver-base.js';

// Flex variant driver types
export type {
  TransformKeyForStorage,
  TransformValueForStorage,
  MTFlexKeyMappingOptions,
  MTFlexValueMappingOptions,
  MTFlexDriverOptions,
  ResolvedMTFlexDriverOptions
} from './driver-flex.js';

// Versioned variant driver types (future - currently empty)
export * from './driver-versioned.js';

// Storage common types (currently empty)
export * from './storage-common.js';

