/**
 * AWS S3 Driver Index
 * 
 * Exports base and flex drivers, driver-specific types, and helper utilities.
 * This is the main export point for the AWS S3 driver package.
 */

// Export base driver (default export and named export)
export { default, default as AwsS3Driver } from './aws-s3.js';
export { default as awsS3Driver } from './aws-s3.js';

// Export flex driver (default export and named export)
export { default as AwsS3FlexDriver } from './aws-s3-flex.js';
export { default as awsS3FlexDriver } from './aws-s3-flex.js';

// Export driver-specific types
export * from './types';

// Export public utilities for custom mapping implementations
export * from './shared-public.js';

// Export deprecated functions for backward compatibility
export * from './shared-deprecated.js';
