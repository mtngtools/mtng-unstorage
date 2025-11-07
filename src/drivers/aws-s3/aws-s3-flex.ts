import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { defineDriver } from 'unstorage';
import type { AwsS3FlexDriverOptions, S3PutObjectOptions } from './types';
import { mapUnstorageKeyToS3Key, validateS3Options, createS3Client, mapS3ObjectKeyToUnstorageKey, getS3Body, putS3Object, deleteS3Object, listS3KeysMapped, getS3Head } from './shared.js';
import { checkReadOnly, clearByListingAndBatching, streamToString } from '../../utils.js';
import { AWS_S3_FLEX_DRIVER_NAME } from './types.js';
import { MTBaseDriverRequestOptions } from '../../types.js';

/*
 * AWS S3 storage driver for unstorage
 * - Uses driver-local helpers in `./shared.ts` for S3-specific behavior
 * - Uses general helpers from `../../utils.ts` where applicable
 */
export default defineDriver((options: AwsS3FlexDriverOptions) => {

  // We'll resolve mappers after validation so defaults can reference the
  // validated options (needed for the built-in toS3StorageKey/fromS3StorageKey).

  const resolvedDriverOptions = validateS3Options({
    ...options,
    name: options.name ?? AWS_S3_FLEX_DRIVER_NAME,
    storagePrefix: options.storagePrefix ?? options.s3StoragePrefix ?? '',
  });
  
  const {
    bucket: Bucket,
    name,
    readOnly = false,    
  } = resolvedDriverOptions;
    
  // Build client if not provided using shared helper
  const client = createS3Client(resolvedDriverOptions);
  
  const toStorageKey = options.toStorageKey ?? mapUnstorageKeyToS3Key;
  const fromStorageKey = options.fromStorageKey ?? mapS3ObjectKeyToUnstorageKey;
  // Value mapping operates on raw storage strings; defaults are pass-through
  const toStorageValue = options.toStorageValue;
  const fromStorageValue = options.fromStorageValue;

  // Runtime validation for value mapping: if toStorageValue provided, require fromStorageValue unless readOnly
  if (toStorageValue && !fromStorageValue && !readOnly) {
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
    } catch (error: any) {
        return false;
    }
  }

  async function getItem(key: string, opts?: MTBaseDriverRequestOptions): Promise<any> {
      try {
        const body = await getS3Body(client, {
          Bucket,
          Key: mapToS3Key(key, resolvedDriverOptions, opts),
        });
        if (!body) return null;
        const content = await streamToString(body);
        // If a fromStorageValue mapper is provided, transform raw string to typed value
        if (fromStorageValue) {
          return await fromStorageValue(content, resolvedDriverOptions as any, opts);
        }
        return content;
      } catch (error: any) {
        return null;
      }
    }

  async function setItem(key: string, value: string, opts?: MTBaseDriverRequestOptions & { s3Options?: S3PutObjectOptions }): Promise<void> {
      // console.debug(`aws-s3-flex storage setItem -- KEY: ${key}  -- Bucket: ${Bucket}`);
      checkReadOnly(readOnly, 'setItem');
      const body = toStorageValue ? await toStorageValue(value, resolvedDriverOptions as any, opts) : value;
      await putS3Object(client, {
        Bucket,
        Key: mapToS3Key(key, resolvedDriverOptions, opts),
        Body: body,
        ...opts?.s3Options,
      } as PutObjectCommandInput);
  }

  async function removeItem(key: string, opts?: MTBaseDriverRequestOptions): Promise<void> {
      checkReadOnly(readOnly, 'removeItem');
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
        opts
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
    clear
  };
});
