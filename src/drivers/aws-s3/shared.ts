import { validateKey } from '../../utils.js';
import { S3Client } from '@aws-sdk/client-s3';
import type { AwsS3DriverOptions, ValidatedAWSS3DriverOptions } from './types.js';

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
 * Converts a storage key to an S3 object key using the provided options
 */
export function toS3StorageKey(key: string, options: { base?: string, s3StoragePrefix?: string }): string {
  validateKey(key);
  const fullKey = joinS3Key(options.base, key);
  return joinS3Key(options.s3StoragePrefix, fullKey);
}

/**
 * Validate required S3 options (client and bucket) and throw helpful errors.
 * This helper is shared by both the basic and flex S3 drivers.
 */
export type S3DriverOptionsMinimal = {
  s3Client?: any;
  bucket?: string | undefined;
  region?: string | undefined;
  accessKeyId?: string | undefined;
  secretAccessKey?: string | undefined;
  sessionToken?: string | undefined;
};

/**
 * Validate required S3 options (client and bucket) and throw helpful errors.
 * Accepts a single options object to allow evolving the signature in future.
 */
export function validateS3Options(
  opts: (AwsS3DriverOptions & {
    s3StoragePrefix: string;
    base: string;
    name: string;
    readOnly: boolean;
    allowClear: boolean;
  })
): ValidatedAWSS3DriverOptions {
  if (!opts || !opts.bucket) {
    throw new Error('S3 bucket name is required');
  }
  const hasAnyCredField = Boolean(opts.accessKeyId || opts.secretAccessKey || opts.sessionToken);
  if (hasAnyCredField) {
    if (!opts.accessKeyId || !opts.secretAccessKey) {
      throw new Error('Both accessKeyId and secretAccessKey are required when providing inline credentials');
    }
  }

  // Return normalized/validated options with required fields present
  return {
    ...(opts.s3Client ? { s3Client: opts.s3Client } : {}),
    bucket: opts.bucket,
    s3StoragePrefix: opts.s3StoragePrefix,
    base: opts.base,
    name: opts.name,
    readOnly: opts.readOnly,
    allowClear: opts.allowClear,
    ...(opts.region ? { region: opts.region } : {}),
    ...(opts.accessKeyId ? { accessKeyId: opts.accessKeyId } : {}),
    ...(opts.secretAccessKey ? { secretAccessKey: opts.secretAccessKey } : {}),
    ...(opts.sessionToken ? { sessionToken: opts.sessionToken } : {}),
  } as ValidatedAWSS3DriverOptions;
}

/**
 * Create or return an S3Client from validated options.
 */
export function createS3Client(opts: ValidatedAWSS3DriverOptions): S3Client {
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
