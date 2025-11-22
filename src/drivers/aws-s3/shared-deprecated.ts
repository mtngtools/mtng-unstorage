/**
 * Deprecated S3 Utilities
 * 
 * Deprecated functions that will be removed in a future major version.
 * These functions are exported for backward compatibility but should not be used in new code.
 */

import { S3Client, GetObjectCommandInput, PutObjectCommandInput, DeleteObjectCommandInput } from '@aws-sdk/client-s3';
import type { ResolvedAWSS3DriverOptions } from './types.js';
import type { MTBaseDriverRequestOptions } from '../../types.js';
import { mapUnstorageKeyToS3Key } from './shared-public.js';
import { buildS3SearchPrefix } from './shared-public.js';
import { filterKeyByDepthByOptions } from '../../utils.js';

/**
 * @deprecated Use mapUnstorageKeyToS3Key instead. This alias will be removed in a future major release.
 */
export const toS3StorageKey = mapUnstorageKeyToS3Key;

/**
 * Fetch an object's Body from S3 using GetObjectCommand.
 * Returns the Body stream/string if present, otherwise null.
 * @deprecated functionality move to nativeDriverAWS.
 */
export async function getS3Body(
  client: S3Client,
  params: GetObjectCommandInput
): Promise<any | null> {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  // console.debug(`Getting S3 object   -- KEY: ${params.Key}    -- Bucket: ${params.Bucket}`);

  const response = await client.send(new GetObjectCommand(params));
  return response.Body ?? null;
}

/**
 * Put an object to S3 using PutObjectCommand.
 * @deprecated functionality move to nativeDriverAWS.
 */
export async function putS3Object(
  client: S3Client,
  params: PutObjectCommandInput
): Promise<void> {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  // console.debug(`Putting S3 object   -- KEY: ${params.Key}    -- Bucket: ${params.Bucket}`);
  await client.send(new PutObjectCommand(params));
}

/**
 * Delete an object from S3 using DeleteObjectCommand.
 * @deprecated functionality move to nativeDriverAWS.
 */
export async function deleteS3Object(
  client: S3Client,
  params: DeleteObjectCommandInput
): Promise<void> {
  // console.debug(`Deleting S3 object   -- KEY: ${params.Key}    -- Bucket: ${params.Bucket}`);
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  await client.send(new DeleteObjectCommand(params));
}

/**
 * List S3 objects under a prefix and map each object's Key using the provided mapper.
 * Returns an array of mapped keys, skipping any that map to undefined.
 * @deprecated functionality move to nativeDriverAWS.
 */
export async function listS3KeysMapped(
  client: S3Client,
  resolvedDriverOptions: ResolvedAWSS3DriverOptions,
  mapKey: (key: string, resolvedDriverOptions: ResolvedAWSS3DriverOptions, requestOpts?: MTBaseDriverRequestOptions) => string | undefined,
  basePrefix: string,
  opts?: MTBaseDriverRequestOptions
): Promise<string[]> {
  const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
  const keys: string[] = [];
  let continuationToken: string | undefined;
  // console.debug(`Listing S3 objects -- maxDepth ${opts?.maxDepth ?? resolvedDriverOptions.maxDepth ?? undefined}  -- basePrefix: ${basePrefix} -- fullBasePrefix: ${resolvedDriverOptions.fullBasePrefix} -- Bucket: ${resolvedDriverOptions.bucket}`);

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: resolvedDriverOptions.bucket,
      Prefix: buildS3SearchPrefix({ fullBasePrefix: resolvedDriverOptions.fullBasePrefix }, basePrefix),
      MaxKeys: 1000,
      ContinuationToken: continuationToken
    }));
    if (response.Contents) {
      for (const object of response.Contents) {
        if (!object.Key) continue;

        const mapped = mapKey(object.Key, resolvedDriverOptions, opts);
        // console.debug(`Mapped S3 object  -- MAPPED: ${mapped} -- KEY: ${object.Key}`);
        if (mapped) {
          // This can be optimized later
          // console.debug(`In filter depth: ${filterKeyByDepthByOptions(mapped, resolvedDriverOptions, opts)} -- MAPPED: ${mapped}  `);
          if (filterKeyByDepthByOptions(mapped, resolvedDriverOptions, opts)) {
            keys.push(mapped);
          }
        }
        // console.debug(`Keys from Listing S3 objects  -- KEYS: ${keys} `);
      }
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

