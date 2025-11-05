import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { defineDriver } from 'unstorage';
import type { AwsS3DriverOptions, S3PutObjectOptions } from './types';
import { toS3StorageKey, joinS3Key, validateS3Options } from './shared.js';
import { filterKeyByDepth, checkReadOnly, streamToString } from '../../utils.js';
import { AWS_S3_FLEX_DRIVER_NAME } from './types.js';

/*
 * AWS S3 storage driver for unstorage
 * - Uses driver-local helpers in `./shared.ts` for S3-specific behavior
 * - Uses general helpers from `../../utils.ts` where applicable
 */
export default defineDriver((options: AwsS3DriverOptions) => {
  const {
    s3Client,
    bucket,
    s3StoragePrefix = '',
    base = '',
    name = AWS_S3_FLEX_DRIVER_NAME, //aws-s3-flex
    readOnly = false,
    allowClear = false,
    region,
    accessKeyId,
    secretAccessKey,
    sessionToken,
  } = options;

  validateS3Options({ s3Client, bucket, region, accessKeyId, secretAccessKey, sessionToken });

  // Build client if not provided
  const client = s3Client ?? new S3Client({
    ...(region ? { region } : {}),
    ...((accessKeyId && secretAccessKey) ? {
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {})
      }
    } : {})
  });

  // Using shared helpers from driver-local `./shared.ts` and general `utils.ts`

  async function hasItem(key: string, _opts: any): Promise<boolean> {
    try {
      const Key = toS3StorageKey(key, { base, s3StoragePrefix });
      const command = new (await import('@aws-sdk/client-s3')).HeadObjectCommand({
        Bucket: bucket,
        Key
      });
      
  await (client as S3Client).send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async function getItem(key: string, _opts?: any): Promise<any> {
    try {
      const Key = toS3StorageKey(key, { base, s3StoragePrefix });
      const command = new (await import('@aws-sdk/client-s3')).GetObjectCommand({
        Bucket: bucket,
        Key
      });
      
  const response = await (client as S3Client).send(command);
      
      if (!response.Body) {
        return null;
      }
      
      const content = await streamToString(response.Body);
      // Return the raw string - the Storage layer will handle deserialization
      return content;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async function setItem(key: string, value: string, opts?: { s3Options?: S3PutObjectOptions }): Promise<void> {
    checkReadOnly(readOnly, 'setItem');
    
    const Key = toS3StorageKey(key, { base, s3StoragePrefix });

    const putObjectParams: PutObjectCommandInput = {
      Bucket: bucket,
      Key,
      Body: value,  // Value is already serialized by the Storage layer
      ...opts?.s3Options // Spread any additional S3 options
    };
    
    const command = new (await import('@aws-sdk/client-s3')).PutObjectCommand(putObjectParams);
  await (client as S3Client).send(command);
  }

  async function removeItem(key: string, _opts: any): Promise<void> {
    checkReadOnly(readOnly, 'removeItem');
    
    const Key = toS3StorageKey(key, { base, s3StoragePrefix });
    const command = new (await import('@aws-sdk/client-s3')).DeleteObjectCommand({
      Bucket: bucket,
      Key
    });
    
  await (client as S3Client).send(command);
  }

  async function getKeys(basePrefix: string, opts: any): Promise<string[]> {
    
    // Build the search prefix by combining the driver base, basePrefix
    let searchPrefix = s3StoragePrefix || '';
    if (base) {
      searchPrefix = joinS3Key(searchPrefix, base);
    }
    if (basePrefix && basePrefix.trim()) {
      // Convert to S3 path format for searching
      const s3BasePrefix = basePrefix.replace(/:/g, '/');
        searchPrefix = joinS3Key(searchPrefix, s3BasePrefix);
    }
    
    const keys: string[] = [];
    let continuationToken: string | undefined;
    
    do {
      const commandParams: any = {
        Bucket: bucket,
        Prefix: searchPrefix,
        MaxKeys: 1000
      };
      
      if (continuationToken) {
        commandParams.ContinuationToken = continuationToken;
      }
      
      const command = new (await import('@aws-sdk/client-s3')).ListObjectsV2Command(commandParams);
  const response = await (client as S3Client).send(command);
      
      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key) {
            let key = object.Key!;
            
            // Remove s3StoragePrefix if present
            if (s3StoragePrefix && key.startsWith(s3StoragePrefix)) {
              key = key.slice(s3StoragePrefix.length);
              if (key.startsWith('/')) {
                key = key.slice(1);
              }
            }
            
            // Remove driver base if present
            if (base && key.startsWith(base)) {
              key = key.slice(base.length);
              if (key.startsWith('/')) {
                key = key.slice(1);
              }
            }
            
            // Convert to unstorage key format (/ to :)
            key = key.replace(/\//g, ':');
            
            // Filter by maxDepth if specified
            if (key && filterKeyByDepth(key, opts?.maxDepth)) {
              keys.push(key);
            }
          }
        }
      }
      
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    
    return keys;
  }

  async function clear(base: string, opts: any): Promise<void> {
    checkReadOnly(readOnly, 'clear');
    
    if (!allowClear) {
      throw new Error('Cannot perform clear: allowClear option must be set to true');
    }
    
    const keys = await getKeys(base || '', opts);
    
    // Delete in batches to avoid overwhelming S3
    const batchSize = 100;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await Promise.all(batch.map((key: string) => removeItem(key, opts)));
    }
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