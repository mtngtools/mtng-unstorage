export { default as AwsS3Driver } from './aws-s3.js';
export { default as AwsS3FlexDriver } from './aws-s3-flex.js';

// Re-export helpers from basic driver for convenience
export * from './aws-s3.js';
export * from './types';
// Export public utilities for custom mapping implementations
export * from './shared-public.js';
// Export deprecated functions for backward compatibility
export * from './shared-deprecated.js';
