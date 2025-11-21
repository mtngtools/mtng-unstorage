/**
 * AWS S3 driver types index
 * 
 * Re-exports all AWS S3 driver-specific types to maintain API compatibility.
 * All existing imports from './types.js' will continue to work.
 */

// Base types
export type {
  SharedAwsS3DriverOptions,
  S3PutObjectOptions,
  AwsS3DriverOptions,
  ResolvedAwsS3DriverOptions,
  ResolvedAWSS3DriverOptions,
  ValidatedAWSS3DriverOptions,
  ConditionalDriver
} from './types-base.js';

export {
  AWS_S3_DRIVER_NAME,
  AWS_S3_FLEX_DRIVER_NAME,
  AWS_S3_VERSIONED_DRIVER_NAME
} from './types-base.js';

// Flex variant types
export type {
  AwsS3FlexDriverOptions
} from './types-flex.js';

// Versioned variant types (future - currently empty)
export * from './types-versioned.js';

