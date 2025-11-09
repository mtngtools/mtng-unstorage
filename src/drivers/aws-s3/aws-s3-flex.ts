import { defineDriver } from 'unstorage';
import type { AwsS3FlexDriverOptions, ResolvedAwsS3DriverOptions } from './types';
import { mapUnstorageKeyToS3Key, validateS3Options, createS3Client, mapS3ObjectKeyToUnstorageKey, nativeDriverAWS } from './shared.js';
import { AWS_S3_FLEX_DRIVER_NAME } from './types.js';
import type { DriverFactory } from '../../types.js';

/**
 * AWS S3 Flex storage driver for unstorage with custom key and value mapping.
 * 
 * This driver extends the base S3 driver with support for custom mapping functions:
 * - `toStorageKey` / `fromStorageKey`: Custom key transformation
 * - `toStorageValue` / `fromStorageValue`: Custom value transformation with type inference
 * 
 * The driver provides conditional method availability based on options:
 * - When `readOnly: true`: `setItem`, `removeItem`, and `clear` are not available
 * - When `allowClear: false` or undefined: `clear` is not available (unless readOnly is true)
 * 
 * The return type is conditionally typed based on the provided options, ensuring
 * TypeScript can detect when methods are unavailable.
 * 
 * @example
 * ```typescript
 * // With value mapping and type inference
 * const driver = awsS3FlexDriver({
 *   bucket: 'my-bucket',
 *   toStorageValue: (v) => JSON.stringify(v),
 *   fromStorageValue: <T>(v: string) => JSON.parse(v) as T
 * });
 * 
 * // TypeScript infers the return type from fromStorageValue
 * const user = await driver.getItem<{ name: string }>('user:123');
 * // user is typed as { name: string } | null
 * ```
 * 
 * Uses driver-local helpers in `./shared.ts` for S3-specific behavior
 * and general helpers from `../../utils.ts` where applicable.
 */

const awsS3FlexDriver: DriverFactory<AwsS3FlexDriverOptions, never> = defineDriver((options: AwsS3FlexDriverOptions) => {
  // We'll resolve mappers after validation so defaults can reference the
  // validated options (needed for the built-in toS3StorageKey/fromS3StorageKey).

  const resolvedDriverOptions = validateS3Options({
    ...options,
    name: options.name ?? AWS_S3_FLEX_DRIVER_NAME,
    storagePrefix: options.storagePrefix ?? options.s3StoragePrefix ?? '',
  }) as ResolvedAwsS3DriverOptions;

  const { bucket: Bucket, name, readOnly = false, allowClear = false } = resolvedDriverOptions;

  // Build client if not provided using shared helper
  const client = createS3Client(resolvedDriverOptions);

  const toStorageKey = options.toStorageKey ?? ((key, drOpts, _reqOpts) => mapUnstorageKeyToS3Key(key, drOpts));
  const fromStorageKey = options.fromStorageKey ?? ((key, drOpts, _reqOpts) => mapS3ObjectKeyToUnstorageKey(key, drOpts));
  // Value mapping operates on raw values/strings; defaults are pass-through
  const toStorageValue = options.toStorageValue;
  const fromStorageValue = options.fromStorageValue;

  // Runtime validation for value mapping: if user provided toStorageValue, require fromStorageValue unless readOnly
  if (options.toStorageValue && !options.fromStorageValue && !readOnly) {
    throw new Error('toStorageValue provided without fromStorageValue; provide both or set readOnly: true');
  }

  const mapToS3Key = (key:string) => toStorageKey(key, resolvedDriverOptions);
  const mapFromS3Key = (key:string) => fromStorageKey(key, resolvedDriverOptions);

  const mapValueToS3 = (value: any, opts?: unknown) => toStorageValue ? toStorageValue(value, resolvedDriverOptions, opts) : value;
  const mapValueFromS3 = (value: string, opts?: unknown) => fromStorageValue ? fromStorageValue(value, resolvedDriverOptions, opts) : value;

  const {
    hasItem,
    getItem,
    setItem,
    removeItem,
    getKeys,
    clear,
  } = nativeDriverAWS( 'flex',
      {
      client,
      mapToS3Key,
      mapFromS3Key,
      mapValueToS3,
      mapValueFromS3,
      Bucket,
      ...resolvedDriverOptions // for {
      //   fullBasePrefix
      // }
    });

  return {
    name,
    flags: {
      maxDepth: true,
    },
    hasItem: hasItem,
    getItem: getItem,
    getKeys: getKeys,
    ...(!readOnly && {
      setItem: setItem,
      removeItem: removeItem,
    }),
    ...(!readOnly && allowClear && {
      clear: clear,
    }),
    } as any;
});

export default awsS3FlexDriver;
