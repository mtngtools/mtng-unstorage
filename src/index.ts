/**
 * Main entry point - exports common types, utilities, and drivers for convenience.
 * 
 * This entry point supports two import strategies:
 * 
 * 1. **Convenience imports** (from root) - Everything available in one import:
 *    ```typescript
 *    import { awsS3Driver, AwsS3DriverOptions, validateKey } from '@mtngtools/unstorage'
 *    ```
 * 
 * 2. **Granular imports** (from subpaths) - Better tree-shaking, import only what you need:
 *    ```typescript
 *    import { awsS3Driver } from '@mtngtools/unstorage/drivers/aws-s3'
 *    import { validateKey } from '@mtngtools/unstorage/utils'
 *    import type { MTBaseDriverOptions } from '@mtngtools/unstorage/types'
 *    ```
 * 
 * Subpath imports are recommended for production builds to optimize bundle size.
 */

// Export common types
export type { 
  MTBaseDriverOptions,
  MTBaseDriverTransactionOptions,
  ConditionalDriver,
  ReadOnlyDriver,
  WritableDriver,
  WritableDriverWithoutClear,
  BaseDriverMethods
} from './types.js';

// Export utilities
export { 
  validateKey 
} from './utils.js';

// Export drivers for convenience (also available via subpaths)
export { 
  default as awsS3Driver,
  AwsS3Driver,
  AwsS3FlexDriver
} from './drivers/aws-s3/index.js';
export {
  default as awsSsmDriver,
  AwsSsmDriver,
  awsSsmFlexDriver,
  AwsSsmFlexDriver
} from './drivers/aws-ssm/index.js';

// Export driver-specific types for convenience
export type { 
  AwsS3DriverOptions,
  S3PutObjectOptions,
  AwsS3FlexDriverOptions
} from './drivers/aws-s3/types/index.js';
export type { AwsSsmDriverOptions, AwsSsmFlexDriverOptions } from './drivers/aws-ssm/types/index.js';

// Export driver helpers for convenience
export { toS3StorageKey } from './drivers/aws-s3/shared-deprecated.js';
export * from './drivers/aws-s3/shared-public.js';