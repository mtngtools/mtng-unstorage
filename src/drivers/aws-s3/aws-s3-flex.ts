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
        return content;
      } catch (error: any) {
        return null;
      }
    }

  async function setItem(key: string, value: string, opts?: MTBaseDriverRequestOptions & { s3Options?: S3PutObjectOptions }): Promise<void> {
      checkReadOnly(readOnly, 'setItem');
      await putS3Object(client, {
        Bucket,
        Key: mapToS3Key(key, resolvedDriverOptions, opts),
        Body: value,
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
