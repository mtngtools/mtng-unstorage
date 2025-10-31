import type {
  S3Client,
  PutObjectCommandInput
} from '@aws-sdk/client-s3';
import { defineDriver } from 'unstorage';
import { validateKey } from '../../utils.js';
import type { MTBaseDriverOptions } from '../../types';

/**
 * Custom type for additional S3 PutObject parameters
 * Excludes Bucket, Key, and Body which are set by the driver
 */
export type S3PutObjectOptions = Omit<PutObjectCommandInput, 'Bucket' | 'Key' | 'Body'>

/**
 * Normalizes a storage key by removing leading/trailing slashes
 * and ensuring consistent path format
 */
function normalizeKey(key: string): string {
  return key.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

/**
 * Filters a key by maxDepth, counting ':' separators
 */
function filterKeyByDepth(key: string, maxDepth: number | undefined): boolean {
  if (maxDepth === undefined) {
    return true;
  }

  let substrCount = 0;
  let index = key.indexOf(':');

  while (index > -1) {
    substrCount++;
    index = key.indexOf(':', index + 1);
  }

  return substrCount <= maxDepth;
}

/**
 * Joins base path with key, handling slashes properly
 */
function joinKey(base: string | undefined, key: string): string {
  if (!base) return normalizeKey(key);
  
  const normalizedBase = normalizeKey(base);
  const normalizedKey = normalizeKey(key);
  
  if (!normalizedKey) return normalizedBase;
  if (!normalizedBase) return normalizedKey;
  
  return `${normalizedBase}/${normalizedKey}`;
}

/**
 * Configuration options for the S3 storage driver
 */
export type awsS3DriverOptions  = MTBaseDriverOptions & {
  /**
   * AWS S3 client instance
   */
  s3Client: S3Client
  
  /**
   * S3 bucket name
   */
  bucket: string
  
  /**
   * Optional S3 storage prefix for all keys in the bucket
   */
  s3StoragePrefix?: string
  
}

/**
 * Converts a storage key to an S3 object key using the provided options
 */
export function toStorageKey(key: string, options: { base?: string, s3StoragePrefix?: string }): string {
  validateKey(key);
  const fullKey = joinKey(options.base, key);
  return joinKey(options.s3StoragePrefix, fullKey);
}

/**
 * AWS S3 storage driver for unstorage
 */
export default defineDriver((options: awsS3DriverOptions) => {
  const {
    s3Client,
    bucket,
    s3StoragePrefix = '',
    base = '',
    name = 'aws-s3',
    readOnly = false,
    allowClear = false
  } = options;

  if (!s3Client) {
    throw new Error('S3Client instance is required');
  }
  
  if (!bucket) {
    throw new Error('S3 bucket name is required');
  }

  /**
   * Throws an error if the driver is in read-only mode
   */
  function checkReadOnly(operation: string): void {
    if (readOnly) {
      throw new Error(`Cannot perform ${operation}: driver is in read-only mode`);
    }
  }

  /**
   * Converts buffer/stream data to string
   */
  async function streamToString(stream: any): Promise<string> {
    if (!stream) return '';
    
    if (typeof stream === 'string') return stream;
    
    if (stream.transformToString) {
      return await stream.transformToString();
    }
    
    // Handle Node.js streams
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }

  async function hasItem(key: string, _opts: any): Promise<boolean> {
    try {
      const s3Key = toStorageKey(key, { base, s3StoragePrefix });
      const command = new (await import('@aws-sdk/client-s3')).HeadObjectCommand({
        Bucket: bucket,
        Key: s3Key
      });
      
      await s3Client.send(command);
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
      const s3Key = toStorageKey(key, { base, s3StoragePrefix });
      const command = new (await import('@aws-sdk/client-s3')).GetObjectCommand({
        Bucket: bucket,
        Key: s3Key
      });
      
      const response = await s3Client.send(command);
      
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
    checkReadOnly('setItem');
    
    const s3Key = toStorageKey(key, { base, s3StoragePrefix });
    
    const putObjectParams: PutObjectCommandInput = {
      Bucket: bucket,
      Key: s3Key,
      Body: value,  // Value is already serialized by the Storage layer
      ...opts?.s3Options // Spread any additional S3 options
    };
    
    const command = new (await import('@aws-sdk/client-s3')).PutObjectCommand(putObjectParams);
    await s3Client.send(command);
  }

  async function removeItem(key: string, _opts: any): Promise<void> {
    checkReadOnly('removeItem');
    
    const s3Key = toStorageKey(key, { base, s3StoragePrefix });
    const command = new (await import('@aws-sdk/client-s3')).DeleteObjectCommand({
      Bucket: bucket,
      Key: s3Key
    });
    
    await s3Client.send(command);
  }

  async function getKeys(basePrefix: string, opts: any): Promise<string[]> {
    
    // Build the search prefix by combining the driver base, basePrefix
    let searchPrefix = s3StoragePrefix || '';
    if (base) {
      searchPrefix = joinKey(searchPrefix, base);
    }
    if (basePrefix && basePrefix.trim()) {
      // Convert to S3 path format for searching
      const s3BasePrefix = basePrefix.replace(/:/g, '/');
      searchPrefix = joinKey(searchPrefix, s3BasePrefix);
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
      const response = await s3Client.send(command);
      
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
    checkReadOnly('clear');
    
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