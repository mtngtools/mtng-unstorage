import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { defineDriver } from 'unstorage';
import type { AwsS3DriverOptions, S3PutObjectOptions } from './types';
import { mapUnstorageKeyToS3Key, validateS3Options, createS3Client, mapS3ObjectKeyToUnstorageKey, getS3Body, putS3Object, deleteS3Object, listS3KeysMapped, getS3Head } from './shared.js';
import { checkReadOnly, streamToString, clearByListingAndBatching } from '../../utils.js';
import { AWS_S3_DRIVER_NAME } from './types.js';
import { MTBaseDriverRequestOptions } from '../../types.js';

/*
 * AWS S3 storage driver for unstorage
 * - Uses driver-local helpers in `./shared.ts` for S3-specific behavior
 * - Uses general helpers from `../../utils.ts` where applicable
 */
export default defineDriver((options: AwsS3DriverOptions) => {
  const resolvedDriverOptions = validateS3Options({
    ...options,
    name: options.name ?? AWS_S3_DRIVER_NAME,
    storagePrefix: options.storagePrefix ?? options.s3StoragePrefix ?? '',
  });

  const { bucket: Bucket, name, readOnly = false } = resolvedDriverOptions;

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

  async function getItem(key: string, _opts?: any): Promise<any> {
    // console.debug(`aws-s3 storage getItem -- KEY: ${key}  -- Bucket: ${Bucket}  -- fullBasePrefix: ${fullBasePrefix}`);
    try {
      const body = await getS3Body(client, {
        Bucket,
        Key: mapUnstorageKeyToS3Key(key, resolvedDriverOptions),
      });
      if (!body) return null;

      const content = await streamToString(body);
      // Return the raw string - the Storage layer will handle deserialization
      return content;
    } catch (error: any) {
      return null;
    }
  }

  async function setItem(
    key: string,
    value: string,
    opts?: { s3Options?: S3PutObjectOptions },
  ): Promise<void> {
    // console.debug(`aws-s3 storage setItem -- KEY: ${key}  -- Bucket: ${Bucket}  -- fullBasePrefix: ${fullBasePrefix}`);
    checkReadOnly(readOnly, 'setItem');
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

  async function removeItem(key: string, _opts: any): Promise<void> {
    // console.debug(`aws-s3 storage removeItem -- KEY: ${key}  -- Bucket: ${Bucket}  -- fullBasePrefix: ${fullBasePrefix}`);
    checkReadOnly(readOnly, 'removeItem');

    await deleteS3Object(client, {
      Bucket,
      Key: mapUnstorageKeyToS3Key(key, resolvedDriverOptions),
    });
  }

  async function getKeys(basePrefix: string, opts: any): Promise<string[]> {
    // console.debug(`aws-s3 storage getKeys -- basePrefix: ${basePrefix}  -- Bucket: ${Bucket}  -- fullBasePrefix: ${fullBasePrefix}`);
    return await listS3KeysMapped(
      client,
      resolvedDriverOptions,
      (s3Key) => mapS3ObjectKeyToUnstorageKey(s3Key, resolvedDriverOptions, opts),
      basePrefix,
      opts,
    );
  }

  async function clear(base: string, opts: any): Promise<void> {
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

  return {
    name,
    flags: {
      maxDepth: true,
    },
    hasItem,
    getItem,
    setItem,
    removeItem,
    getKeys,
    clear,
  };
});