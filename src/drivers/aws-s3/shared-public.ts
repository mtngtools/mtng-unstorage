/**
 * Public S3 Utilities
 * 
 * Public utilities useful for users building custom key/value mapping functions.
 * These functions are exported from the driver index for external use.
 */

import { validateKey } from '../../utils.js';
import type { AwsS3DriverOptions } from './types.js';
import type { MTBaseDriverTransactionOptions, ResolvedMTFlexDriverOptions } from '../../types.js';
import { S3Client } from '@aws-sdk/client-s3';
import { validateBaseDriverOptions, validateAWSRegionAndCredentials } from '../../utils.js';

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
 */
export function buildS3SearchPrefix(
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
export function mapUnstorageKeyToS3Key(params: {
  key: string;
  resolvedDriverOptions: { fullBasePrefix: string };
  transactionOptions?: MTBaseDriverTransactionOptions;
}): string {
  const { key, resolvedDriverOptions } = params;
  const s3CompatibleKey = key.replace(/:/g, '/');
  validateKey(s3CompatibleKey);
  return joinS3Key(resolvedDriverOptions.fullBasePrefix, s3CompatibleKey);
}

/**
 * Variant of mapUnstorageKeyToS3Key that ensures the final segment is stored with a `.json` extension.
 * Delegates base mapping to mapUnstorageKeyToS3Key and then appends the extension to the resulting string.
 *
 * Examples:
 *   toS3KeyWithJSONExt('user:123', { fullBasePrefix: 'prefix/base' }) -> 'prefix/base/user:123.json'
 *   toS3KeyWithJSONExt('folder:config', { fullBasePrefix: '' }) -> 'folder:config.json'
 */
export const toS3KeyWithJSONExt = (params: {
  key: string;
  resolvedDriverOptions: ResolvedMTFlexDriverOptions;
  transactionOptions?: MTBaseDriverTransactionOptions;
}): string => `${mapUnstorageKeyToS3Key(params)}.json`;

/**
 * Map an S3 object key to an unstorage key.
 * - Uses a custom fromStorageKey present on resolvedDriverOptions when provided
 * - Falls back to the default fromS3StorageKey otherwise
 * Returns undefined when no valid mapping is produced.
 */
export function mapS3ObjectKeyToUnstorageKey(params: {
  key: string; // s3 object key
  resolvedDriverOptions: { fullBasePrefix: string };
  transactionOptions?: MTBaseDriverTransactionOptions;
}): string {
  const { key, resolvedDriverOptions } = params;
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
 *  fromS3KeyWithJSONExt('prefix/base/user:123.json', { fullBasePrefix: 'prefix/base' }) -> 'user:123'
 *  fromS3KeyWithJSONExt('folder:config.json', { fullBasePrefix: '' }) -> 'folder:config'
 *  fromS3KeyWithJSONExt('folder:config', { fullBasePrefix: '' }) -> 'folder:config'
 */
export const fromS3KeyWithJSONExt = (params: {
  key: string;
  resolvedDriverOptions: { fullBasePrefix: string };
  transactionOptions?: MTBaseDriverTransactionOptions;
}): string => {
  const base = mapS3ObjectKeyToUnstorageKey({
    key: params.key,
    resolvedDriverOptions: params.resolvedDriverOptions as unknown as ResolvedMTFlexDriverOptions,
    transactionOptions: params.transactionOptions,
  });
  return base.endsWith('.json') ? base.slice(0, -5) : base;
};

/**
 * Validate required S3 options (client and bucket) and throw helpful errors.
 * Accepts a single options object to allow evolving the signature in future.
 */
export function validateS3Options(
  opts: AwsS3DriverOptions
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

