import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { defineDriver } from 'unstorage';
import type { AwsS3FlexDriverOptions, S3PutObjectOptions } from './types';
import { mapUnstorageKeyToS3Key, validateS3Options, createS3Client, mapS3ObjectKeyToUnstorageKey, getS3Body, putS3Object, deleteS3Object, listS3KeysMapped, getS3Head } from './shared.js';
import { clearByListingAndBatching, streamToString } from '../../utils.js';
import { AWS_S3_FLEX_DRIVER_NAME } from './types.js';
import type { MTBaseDriverRequestOptions, ConditionalDriver } from '../../types.js';

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
export default defineDriver((options: AwsS3FlexDriverOptions) => {
  // We'll resolve mappers after validation so defaults can reference the
  // validated options (needed for the built-in toS3StorageKey/fromS3StorageKey).

  const resolvedDriverOptions = validateS3Options({
    ...options,
    name: options.name ?? AWS_S3_FLEX_DRIVER_NAME,
    storagePrefix: options.storagePrefix ?? options.s3StoragePrefix ?? '',
  });

  const { bucket: Bucket, name, readOnly = false, allowClear = false } = resolvedDriverOptions;

  // Build client if not provided using shared helper
  const client = createS3Client(resolvedDriverOptions);

  const toStorageKey = options.toStorageKey ?? mapUnstorageKeyToS3Key;
  const fromStorageKey = options.fromStorageKey ?? mapS3ObjectKeyToUnstorageKey;
  // Value mapping operates on raw values/strings; defaults are pass-through
  const toStorageValue = options.toStorageValue;
  const fromStorageValue = options.fromStorageValue;

  // Runtime validation for value mapping: if user provided toStorageValue, require fromStorageValue unless readOnly
  if (options.toStorageValue && !options.fromStorageValue && !readOnly) {
    throw new Error('toStorageValue provided without fromStorageValue; provide both or set readOnly: true');
  }

  const mapToS3Key = toStorageKey;
  const mapFromS3Key = fromStorageKey;

  async function hasItem(key: string, opts: MTBaseDriverRequestOptions): Promise<boolean> {
    try {
      await getS3Head(client, {
        Bucket,
        Key: mapToS3Key(key, resolvedDriverOptions, opts),
      });
      return true;
    } catch  {
      return false;
    }
  }

  /**
   * Retrieves an item from S3 storage with optional value transformation.
   * 
   * If `fromStorageValue` is provided in the driver options, it will be used to
   * transform the raw string value into the typed value. The generic type parameter
   * flows through to the mapper function for proper type inference.
   * 
   * @template T - The expected return type. Defaults to `unknown`.
   * @param key - The storage key to retrieve
   * @param opts - Optional request options (e.g., maxDepth)
   * @returns The item value as type T (transformed if fromStorageValue is provided), or null if not found
   * 
   * @example
   * ```typescript
   * // With value mapping - type inferred from fromStorageValue
   * const driver = awsS3FlexDriver({
   *   bucket: 'my-bucket',
   *   fromStorageValue: <T>(v: string) => JSON.parse(v) as T
   * });
   * 
   * const user = await driver.getItem<{ name: string }>('user:123');
   * // user is typed as { name: string } | null
   * ```
   */
  async function getItem<T = unknown>(key: string, opts?: MTBaseDriverRequestOptions): Promise<T | null> {
    try {
      const body = await getS3Body(client, {
        Bucket,
        Key: mapToS3Key(key, resolvedDriverOptions, opts),
      });
      if (!body) return null;
      const content = await streamToString(body);
      // If a fromStorageValue mapper is provided, transform raw string to typed value
      if (fromStorageValue) {
        return await fromStorageValue<T>(content, resolvedDriverOptions as any, opts);
      }
      return content as T;
    } catch {
      return null;
    }
  }

  async function setItem(
    key: string,
    value: string,
    opts?: MTBaseDriverRequestOptions & { s3Options?: S3PutObjectOptions },
  ): Promise<void> {
    // console.debug(`aws-s3-flex storage setItem -- KEY: ${key}  -- Bucket: ${Bucket}`);
    const body = toStorageValue ? await toStorageValue(value, resolvedDriverOptions as any, opts) : value;
    await putS3Object(
      client,
      {
        Bucket,
        Key: mapToS3Key(key, resolvedDriverOptions, opts),
        Body: body,
        ...opts?.s3Options,
      } as PutObjectCommandInput,
    );
  }

  async function removeItem(key: string, opts?: MTBaseDriverRequestOptions): Promise<void> {
    await deleteS3Object(client, {
      Bucket,
      Key: mapToS3Key(key, resolvedDriverOptions, opts),
    });
  }

  async function getKeys(basePrefix: string, opts: MTBaseDriverRequestOptions): Promise<string[]> {
    // console.debug(`aws-s3-flex storage getKeys -- basePrefix: ${basePrefix}  -- Bucket: ${Bucket}`);
    return await listS3KeysMapped(
      client,
      resolvedDriverOptions,
      (s3Key) => mapFromS3Key(s3Key, resolvedDriverOptions, opts),
      basePrefix,
      opts,
    );
  }

  async function clear(base: string, opts: MTBaseDriverRequestOptions): Promise<void> {
    await clearByListingAndBatching({
      opts,
      baseToClear: base,
      resolvedDriverOptions,
      getKeys,
      removeItem,
      batchSize: 100,
    });
  }

  // Build return object conditionally based on options
  const driver = {
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
  } as ConditionalDriver<typeof resolvedDriverOptions>;

  return driver;
});
