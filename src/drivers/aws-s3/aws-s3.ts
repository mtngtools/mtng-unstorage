import { defineDriver } from 'unstorage';
import type { AwsS3DriverOptions  } from './types';
import { mapUnstorageKeyToS3Key, validateS3Options, createS3Client, mapS3ObjectKeyToUnstorageKey } from './shared-public.js';
import { nativeDriverAWS } from './shared-native.js';
import { AWS_S3_DRIVER_NAME } from './types.js';
import type {  ConditionalDriver, DriverFactory, MTBaseDriverTransactionOptions } from '../../types.js';

/**
 * AWS S3 storage driver for unstorage.
 * 
 * This driver provides conditional method availability based on options:
 * - When `readOnly: true`: `setItem`, `removeItem`, and `clear` are not available
 * - When `allowClear: false` or undefined: `clear` is not available (unless readOnly is true)
 * 
 * The return type is conditionally typed based on the provided options, ensuring
 * TypeScript can detect when methods are unavailable.
 * 
 * @example
 * ```typescript
 * // Read-only driver - only read methods available
 * const readOnlyDriver = awsS3Driver({ bucket: 'my-bucket', readOnly: true });
 * // TypeScript knows: readOnlyDriver.setItem is undefined
 * 
 * // Full access driver with clear enabled
 * const fullDriver = awsS3Driver({ bucket: 'my-bucket', allowClear: true });
 * // TypeScript knows: fullDriver.clear is available
 * ```
 * 
 * Uses driver-local helpers in `./shared.ts` for S3-specific behavior
 * and general helpers from `../../utils.ts` where applicable.
 */
const awsS3Driver: DriverFactory<AwsS3DriverOptions, never> = defineDriver((options: AwsS3DriverOptions): ConditionalDriver<typeof options> => {
  const resolvedDriverOptions = validateS3Options({
    ...options,
    name: options.name ?? AWS_S3_DRIVER_NAME,
    storagePrefix: options.storagePrefix ?? options.s3StoragePrefix ?? '',
  });

  const { bucket: Bucket, name, readOnly = false, allowClear = false } = resolvedDriverOptions;

  // Build client if not provided using shared helper
  const client = createS3Client(resolvedDriverOptions);

  const mapToS3Key = (key:string, transactionOptions?: MTBaseDriverTransactionOptions) => mapUnstorageKeyToS3Key({ key, resolvedDriverOptions, transactionOptions });
  const mapFromS3Key = (key:string, transactionOptions?: MTBaseDriverTransactionOptions) => mapS3ObjectKeyToUnstorageKey({ key, resolvedDriverOptions, transactionOptions });

  const mapValueToS3 = (value: any) => value;
  const mapValueFromS3 = (value: string) => value;

  const {
    hasItem,
    getItem,
    setItem,
    removeItem,
    getKeys,
    clear,
  } = nativeDriverAWS( 'base',
      {
      client,
      mapToS3Key,
      mapFromS3Key,
      mapValueFromS3,
      mapValueToS3,
      Bucket,
      ...resolvedDriverOptions // for {
      //   fullBasePrefix
      // }
    });

  // Build return object conditionally based on options
  const driver: ConditionalDriver<typeof resolvedDriverOptions> = {
    name,
    flags: {
      maxDepth: true,
    },
    hasItem,
    getItem,
    getKeys,
    ...(!readOnly && {
      setItem,
      removeItem,
    }),
    ...(!readOnly && allowClear && {
      clear,
    }),
  };

  return driver;
});

export default awsS3Driver;