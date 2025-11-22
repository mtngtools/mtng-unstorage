/**
 * Native AWS Driver Factory
 * 
 * Contains only the native driver factory function that implements core driver methods.
 * This is internal implementation and should not be exported from the driver index.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import type { MTBaseDriverRequestOptions, MTDriverType } from '../../types.js';
import type { S3PutObjectOptions } from './types.js';
import { streamToString, clearByListingAndBatching } from '../../utils.js';
import { filterKeyByDepth } from 'unstorage';
import { getS3Body } from './shared-deprecated.js';
import { buildS3SearchPrefix } from './shared-public.js';

export const nativeDriverAWS = (
  driverType: MTDriverType,
  resolvedDriverOptions: {
    client: S3Client;
    Bucket: string;
    fullBasePrefix: string;
    maxDepth?: number;
    mapToS3Key: (key: string) => string;
    mapFromS3Key: (key: string) => string;
    mapValueToS3: (value: any) => string;
    mapValueFromS3: (value: string) => any;
  }) => {

  const {
    client,
    Bucket,
    fullBasePrefix,
    mapToS3Key,
    mapFromS3Key,
    mapValueToS3,
    mapValueFromS3
  } = resolvedDriverOptions;

  const hasItem = async (key: string, _opts?: MTBaseDriverRequestOptions) => {
    try {
      const command = new HeadObjectCommand({
        Bucket,
        Key: mapToS3Key(key),
      });

      await client.send(command);
      return true;
    } catch {
      return false;
    }
  };

  const getItem = async <T = unknown>(key: string, _opts?: MTBaseDriverRequestOptions) => {
    // console.debug(`aws-s3 storage getItem -- KEY: ${key}  -- Bucket: ${Bucket}  -- fullBasePrefix: ${fullBasePrefix}`);
    try {
      const body = await getS3Body(client, {
        Bucket,
        Key: mapToS3Key(key),
      });
      if (!body) return null;
      const content = await streamToString(body);
      return await mapValueFromS3(content) as T;
    } catch {
      return null;
    }
  };

  const setItem = async (key: string, value: string, _opts?: MTBaseDriverRequestOptions & { s3Options?: S3PutObjectOptions }) => {
    // console.debug(`Putting S3 object   -- KEY: ${params.Key}    -- Bucket: ${params.Bucket}`);

    const optionsToAdd = (_opts && _opts.s3Options) ? { ..._opts.s3Options } : {};

    await client.send(new PutObjectCommand({
      Bucket,
      Key: mapToS3Key(key),
      Body: mapValueToS3(value),
      ContentType: 'application/json',
      ...optionsToAdd,
    }));
  };

  const setItemVersioned = async (key: string, value: string, _opts?: MTBaseDriverRequestOptions & { s3Options?: S3PutObjectOptions }) => {
    // console.debug(`Putting S3 object   -- KEY: ${params.Key}    -- Bucket: ${params.Bucket}`);

    const optionsToAdd = (_opts && _opts.s3Options) ? { ..._opts.s3Options } : {};

    await client.send(new PutObjectCommand({
      Bucket,
      Key: mapToS3Key(key),
      Body: value,
      ContentType: 'application/json',
      ...optionsToAdd,
    }));
  };

  const removeItem = async (key: string, _opts?: MTBaseDriverRequestOptions) => {
    await client.send(new DeleteObjectCommand({
      Bucket,
      Key: mapToS3Key(key),
    }));
  };

  const getKeys = async (base?: string, _opts?: MTBaseDriverRequestOptions) => {
    const keys: string[] = [];
    let continuationToken: string | undefined;
    const maxDepth = _opts?.maxDepth ?? resolvedDriverOptions.maxDepth ?? undefined;
    // console.debug(`Listing S3 objects -- maxDepth ${opts?.maxDepth ?? resolvedDriverOptions.maxDepth ?? undefined}  -- basePrefix: ${basePrefix} -- fullBasePrefix: ${resolvedDriverOptions.fullBasePrefix} -- Bucket: ${resolvedDriverOptions.bucket}`);

    do {
      const response = await client.send(new ListObjectsV2Command({
        Bucket,
        Prefix: buildS3SearchPrefix({ fullBasePrefix }, base),
        MaxKeys: 1000,
        ContinuationToken: continuationToken
      }));
      if (response.Contents) {
        for (const object of response.Contents) {
          if (!object.Key) continue;

          const mapped = mapFromS3Key(object.Key);
          // console.debug(`Mapped S3 object  -- MAPPED: ${mapped} -- KEY: ${object.Key}`);
          if (mapped) {
            // This can be optimized later
            // console.debug(`In filter depth: ${filterKeyByDepthByOptions(mapped, resolvedDriverOptions, opts)} -- MAPPED: ${mapped}  `);
            if (filterKeyByDepth(mapped, maxDepth)) {
              keys.push(mapped);
            }
          }
          // console.debug(`Keys from Listing S3 objects  -- KEYS: ${keys} `);
        }
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return keys;
  };

  const clear = async (base: string, opts?: any): Promise<void> => {
    const args = {
      opts,
      baseToClear: base,
      getKeys,
      removeItem,
    };
    await clearByListingAndBatching(args);
  };

  return {
    hasItem,
    getItem,
    setItem: (driverType === 'versioned') ? setItemVersioned : setItem,
    removeItem,
    getKeys,
    clear: clear
  };
};

