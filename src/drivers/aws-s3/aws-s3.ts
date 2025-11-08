import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { defineDriver } from 'unstorage';
import type { AwsS3DriverOptions, S3PutObjectOptions } from './types';
import { mapUnstorageKeyToS3Key, validateS3Options, createS3Client, mapS3ObjectKeyToUnstorageKey, getS3Body, putS3Object, deleteS3Object, listS3KeysMapped, getS3Head } from './shared.js';
import { streamToString, clearByListingAndBatching } from '../../utils.js';
import { AWS_S3_DRIVER_NAME } from './types.js';
import type { MTBaseDriverRequestOptions, ConditionalDriver } from '../../types.js';

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
export default defineDriver((options: AwsS3DriverOptions) => {
  const resolvedDriverOptions = validateS3Options({
    ...options,
    name: options.name ?? AWS_S3_DRIVER_NAME,
    storagePrefix: options.storagePrefix ?? options.s3StoragePrefix ?? '',
  });

  const { bucket: Bucket, name, readOnly = false, allowClear = false } = resolvedDriverOptions;

  // Build client if not provided using shared helper
  const client = createS3Client(resolvedDriverOptions);

  // Using shared helpers from driver-local `./shared.ts` and general `utils.ts`

  async function hasItem(key: string, opts: MTBaseDriverRequestOptions): Promise<boolean> {
    // console.debug(`aws-s3 storage hasItem -- KEY: ${key}  -- Bucket: ${Bucket}  -- fullBasePrefix: ${fullBasePrefix}`);
    try {
      await getS3Head(client, {
        Bucket,
        Key: mapUnstorageKeyToS3Key(key, resolvedDriverOptions, opts),
      });
      return true;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Retrieves an item from S3 storage.
   * 
   * @template T - The expected return type. Defaults to `unknown`.
   * @param key - The storage key to retrieve
   * @param _opts - Optional request options (e.g., maxDepth)
   * @returns The item value as type T, or null if not found
   * 
   * @example
   * ```typescript
   * // Type inference
   * const value = await driver.getItem<string>('my-key');
   * // value is typed as string | null
   * 
   * // With automatic deserialization
   * const data = await driver.getItem<{ name: string }>('user:123');
   * // data is typed as { name: string } | null
   * ```
   */
  async function getItem<T = unknown>(key: string, _opts?: MTBaseDriverRequestOptions): Promise<T | null> {
    // console.debug(`aws-s3 storage getItem -- KEY: ${key}  -- Bucket: ${Bucket}  -- fullBasePrefix: ${fullBasePrefix}`);
    try {
      const body = await getS3Body(client, {
        Bucket,
        Key: mapUnstorageKeyToS3Key(key, resolvedDriverOptions),
      });
      if (!body) return null;

      const content = await streamToString(body);
      // Return the raw string - the Storage layer will handle deserialization
      return content as T;
    } catch (error: any) {
      return null;
    }
  }

  async function setItem(
    key: string,
    value: string,
    opts?: MTBaseDriverRequestOptions & { s3Options?: S3PutObjectOptions },
  ): Promise<void> {
    // console.debug(`aws-s3 storage setItem -- KEY: ${key}  -- Bucket: ${Bucket}  -- fullBasePrefix: ${fullBasePrefix}`);
    await putS3Object(
      client,
      {
        Bucket,
        Key: mapUnstorageKeyToS3Key(key, resolvedDriverOptions),
        Body: value,
        ...opts?.s3Options, // Spread any additional S3 options
      } as PutObjectCommandInput,
    );
  }

  async function removeItem(key: string, _opts?: MTBaseDriverRequestOptions): Promise<void> {
    // console.debug(`aws-s3 storage removeItem -- KEY: ${key}  -- Bucket: ${Bucket}  -- fullBasePrefix: ${fullBasePrefix}`);
    await deleteS3Object(client, {
      Bucket,
      Key: mapUnstorageKeyToS3Key(key, resolvedDriverOptions),
    });
  }

  async function getKeys(basePrefix: string, opts?: MTBaseDriverRequestOptions): Promise<string[]> {
    // console.debug(`aws-s3 storage getKeys -- basePrefix: ${basePrefix}  -- Bucket: ${Bucket}  -- fullBasePrefix: ${fullBasePrefix}`);
    return await listS3KeysMapped(
      client,
      resolvedDriverOptions,
      (s3Key) => mapS3ObjectKeyToUnstorageKey(s3Key, resolvedDriverOptions, opts),
      basePrefix,
      opts,
    );
  }

  async function clear(base: string, opts?: MTBaseDriverRequestOptions): Promise<void> {
    // console.debug(`aws-s3 storage clear -- base: ${base}  -- Bucket: ${Bucket}  -- fullBasePrefix: ${fullBasePrefix}`);
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