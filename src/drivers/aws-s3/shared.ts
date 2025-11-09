import { validateKey, validateBaseDriverOptions, validateAWSRegionAndCredentials, filterKeyByDepthByOptions, streamToString, clearByListingAndBatching } from '../../utils.js';
import { GetObjectCommandInput, PutObjectCommandInput, DeleteObjectCommandInput, S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import type { AwsS3DriverOptions, ResolvedAWSS3DriverOptions, S3PutObjectOptions } from './types.js';
import type { MTBaseDriverRequestOptions, MTDriverType, ResolvedMTFlexDriverOptions } from '../../types.js';
import { filterKeyByDepth } from 'unstorage';

/*
 * NOTE: The old backward-compatible aliases (normalizeKey, joinKey, toStorageKey)
 * have been removed intentionally. This is a breaking change and will be
 * documented/released in the next major version. For now consumers should
 * use the explicit S3-specific helpers exported here (names include "S3").
 */

/**
 * Normalizes a storage key by removing leading/trailing slashes
 * and ensuring consistent path format (S3-driver specific).
 */
export function normalizeS3Key(key: string): string {
  if (!key) return '';
  return key
    .split('/')
    .filter(Boolean)
    .join('/');
}

/**
 * Joins base path with key, handling slashes properly (S3-driver specific)
 */
export function joinS3Key(base: string | undefined, key: string): string {
  if (!base) return normalizeS3Key(key);

  const normalizedBase = normalizeS3Key(base);
  const normalizedKey = normalizeS3Key(key);

  if (!normalizedKey) return normalizedBase;
  if (!normalizedBase) return normalizedKey;

  return `${normalizedBase}/${normalizedKey}`;
}

/**
 * Build the S3 search prefix for ListObjectsV2 by combining storagePrefix, base,
 * and an optional unstorage basePrefix (":" separated) converted to S3 path format.
 * 
 */
export function buildS3SearchPrefix (
  resolvedDriverOptions: { fullBasePrefix: string },
  basePrefix?: string
): string {
  let searchPrefix = resolvedDriverOptions.fullBasePrefix || '';
    if (basePrefix && basePrefix.trim()) {
      const s3BasePrefix = basePrefix.replace(/:/g, '/');
      searchPrefix = joinS3Key(searchPrefix, s3BasePrefix);
    } else if (searchPrefix) {
      // Ensure trailing slash when searching by just the prefix root
      if (!searchPrefix.endsWith('/')) searchPrefix += '/';
    }
  return searchPrefix;
}

/**
 * Converts an unstorage key to an S3 object key using the provided options
 * (S3-driver specific)
 */
export function mapUnstorageKeyToS3Key(
  key: string, 
  resolvedDriverOptions: {fullBasePrefix: string}, 
  _requestOpts?: MTBaseDriverRequestOptions
): string {
  const s3CompatibleKey = key.replace(/:/g, '/');
  validateKey(s3CompatibleKey);
  return joinS3Key(resolvedDriverOptions.fullBasePrefix, s3CompatibleKey);
}

/**
 * @deprecated Use mapUnstorageKeyToS3Key instead. This alias will be removed in a future major release.
 */
export const toS3StorageKey = mapUnstorageKeyToS3Key;

/**
 * Variant of mapUnstorageKeyToS3Key that ensures the final segment is stored with a `.json` extension.
 * Delegates base mapping to mapUnstorageKeyToS3Key and then appends the extension to the resulting string.
 *
 * Examples:
 *   makeS3KeyWithJSONExt('user:123', { fullBasePrefix: 'prefix/base' }) -> 'prefix/base/user:123.json'
 *   makeS3KeyWithJSONExt('folder:config', { fullBasePrefix: '' }) -> 'folder:config.json'
 */
export const toS3KeyWithJSONExt = (
  key: string,
  resolvedDriverOptions: ResolvedMTFlexDriverOptions,
  requestOpts?: MTBaseDriverRequestOptions,
): string => `${mapUnstorageKeyToS3Key(key, resolvedDriverOptions, requestOpts)}.json`;

/**
 * Map an S3 object key to an unstorage key.
 * - Uses a custom fromStorageKey present on resolvedDriverOptions when provided
 * - Falls back to the default fromS3StorageKey otherwise
 * Returns undefined when no valid mapping is produced.
 */
export function mapS3ObjectKeyToUnstorageKey(
  key: string, // s3 object key
  resolvedDriverOptions: ResolvedMTFlexDriverOptions, 
  _requestOpts?: MTBaseDriverRequestOptions
): string {
  if (!key) return '';
  let retKey = key;
  
  // Remove driver base if present
  const { fullBasePrefix } = resolvedDriverOptions;
  if (fullBasePrefix && retKey.startsWith(fullBasePrefix)) {
    retKey = retKey.slice(fullBasePrefix.length);
    if (retKey.startsWith('/')) retKey = retKey.slice(1);
  }

  // Convert to unstorage key format (/ -> :)
  retKey = retKey.replace(/\//g, ':');

  return retKey;
}

/**
 * Variant of mapS3ObjectKeyToUnstorageKey that strips a trailing `.json` extension
 * from the final segment if present, after performing base-prefix removal and `/` -> `:` conversion.
 *
 * Examples:
 *  keyFromS3ObjectWithJSONExt('prefix/base/user:123.json', { fullBasePrefix: 'prefix/base' }) -> 'user:123'
 *  keyFromS3ObjectWithJSONExt('folder:config.json', { fullBasePrefix: '' }) -> 'folder:config'
 *  keyFromS3ObjectWithJSONExt('folder:config', { fullBasePrefix: '' }) -> 'folder:config'
 */
export const fromS3KeyWithJSONExt = (
  s3Key: string,
  resolvedDriverOptions: { fullBasePrefix: string },
  _requestOpts?: MTBaseDriverRequestOptions,
): string => {
  const base = mapS3ObjectKeyToUnstorageKey(
    s3Key,
    resolvedDriverOptions as unknown as ResolvedMTFlexDriverOptions,
    _requestOpts,
  );
  return base.endsWith('.json') ? base.slice(0, -5) : base;
}

/**
 * Validate required S3 options (client and bucket) and throw helpful errors.
 * Accepts a single options object to allow evolving the signature in future.
 */
export function validateS3Options(
  opts: (AwsS3DriverOptions)
) {

  const resolvedBase = validateBaseDriverOptions({ ...opts, storagePrefix: opts.storagePrefix ?? opts.s3StoragePrefix ?? '' });
  const resolvedAWSRegionandCredentials = validateAWSRegionAndCredentials(opts);
  const fullBasePrefix = joinS3Key(resolvedBase.storagePrefix, resolvedBase.base);

  if (!opts || !opts.bucket) {
    throw new Error('S3 bucket name is required');
  }
  const hasAnyCredField = Boolean(opts.accessKeyId || opts.secretAccessKey || opts.sessionToken);
  if (hasAnyCredField) {
    if (!opts.accessKeyId || !opts.secretAccessKey) {
      throw new Error('Both accessKeyId and secretAccessKey are required when providing inline credentials');
    }
  }

  return {
    ...(opts.s3Client ? { s3Client: opts.s3Client } : {}),
    bucket: opts.bucket,
    ...resolvedBase,
    fullBasePrefix,
    ...resolvedAWSRegionandCredentials,
  };
}

/**
 * Create or return an S3Client from validated options.
 */
export function createS3Client(opts: AwsS3DriverOptions): S3Client {
  if (opts.s3Client) return opts.s3Client as S3Client;
  return new S3Client({
    ...(opts.region ? { region: opts.region } : {}),
    ...((opts.accessKeyId && opts.secretAccessKey) ? {
      credentials: {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
        ...(opts.sessionToken ? { sessionToken: opts.sessionToken } : {})
      }
    } : {})
  });
}

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
      Prefix: buildS3SearchPrefix({ fullBasePrefix: resolvedDriverOptions.fullBasePrefix },basePrefix),
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

/**
 * Send a HeadObjectCommand to S3 to check for object existence.
*/
export async function getS3Head(client:S3Client, params: { Bucket: string; Key: string; }, ) {
  const command = new (await import('@aws-sdk/client-s3')).HeadObjectCommand(params);

  await client.send(command);
}


export const nativeDriverAWS = (
  driverType: MTDriverType,
  resolvedDriverOptions: {
    client: S3Client, 
    Bucket: string,
    fullBasePrefix: string,
    maxDepth?: number,
    mapToS3Key: (key:string) => string,
    mapFromS3Key: (key:string) => string,
    mapValueToS3: (value: any) => string,
    mapValueFromS3: (value: string) => any
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

    const hasItem = async (key:string, _opts?: MTBaseDriverRequestOptions) => {
    
      try {
        const command = new HeadObjectCommand({
            Bucket,
            Key: mapToS3Key(key),
          }
        );
    
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
      } catch  {
        return null;
      }
    }

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
      setItem : (driverType === 'versioned') ? setItemVersioned : setItem,
      removeItem,
      getKeys,
      clear: clear
    };
  };