import type { MTBaseDriverOptions, AwsRegionAndCredentials, MTFlexDriverOptions, ResolvedMTBaseDriverOptions, Prettify } from '../../types';
import type { S3Client, PutObjectCommandInput } from '@aws-sdk/client-s3';

/**
 * Generic flex driver options alias that currently equals MTBaseDriverOptions.
 * This is the extension point for non-breaking flex-specific options later.
 */
/**
 * Shared S3-specific options used by both the basic and flex drivers.
 */
/**
 * Shared AWS S3 options used by both drivers.
 *
 * Credentials rules (enforced at type level via discriminated union):
 * - Either provide both accessKeyId and secretAccessKey (sessionToken optional),
 *   or provide none of these three fields.
 * - Supplying only one of accessKeyId/secretAccessKey is disallowed.
 * - Supplying sessionToken without the pair is disallowed.
 */
type SharedAwsS3DriverOptionsBase = {
  /**
   * AWS S3 client instance. If omitted, the driver will construct one.
   */
  s3Client?: S3Client;

  /**
   * S3 bucket name
   */
  bucket: string;

  /**
   * Optional S3 storage prefix for all keys in the bucket
  * @deprecated Use `storagePrefix` instead. `s3StoragePrefix` is kept only for
  * backwards compatibility; prefer `storagePrefix` for new callers.
  */
  s3StoragePrefix?: string;

  // `storagePrefix` is declared on `MTBaseDriverOptions`; prefer that.
};

export type SharedAwsS3DriverOptions = SharedAwsS3DriverOptionsBase & AwsRegionAndCredentials;

/**
 * Flex driver options: MTFlexDriverOptions + S3-specific shared options.
 */
export type AwsS3FlexDriverOptions = Prettify<MTFlexDriverOptions & SharedAwsS3DriverOptions>;

/**
 * Custom type for additional S3 PutObject parameters
 * Excludes Bucket, Key, and Body which are set by the driver
 */
export type S3PutObjectOptions = Prettify<Omit<PutObjectCommandInput, 'Bucket' | 'Key' | 'Body'>>

/**
 * Configuration options for the S3 storage driver
 */
export type AwsS3DriverOptions = Prettify<MTBaseDriverOptions & SharedAwsS3DriverOptions>;

export default {} as const;

/**
 * Driver name constants
 */
export const AWS_S3_DRIVER_NAME = 'aws-s3' as const;
export const AWS_S3_FLEX_DRIVER_NAME = 'aws-s3-flex' as const;

/**
 * Validated S3 driver options returned by validateS3Options.
 * Assumes drivers set defaults before validation, so formerly-optional
 * fields (base, name, readOnly, allowClear, storagePrefix) are present.
 */
export type ResolvedAWSS3DriverOptions = Prettify<
  ResolvedMTBaseDriverOptions
  & SharedAwsS3DriverOptionsBase
  & Required<Pick<SharedAwsS3DriverOptionsBase, 's3Client'>>
  & AwsRegionAndCredentials
  > 

/**
 * @deprecated Use ResolvedAWSS3DriverOptions instead. Will be removed in a future major release.
 */
export type ValidatedAWSS3DriverOptions = ResolvedAWSS3DriverOptions;

/**
 * Conditional driver type for AWS S3 driver based on options.
 * Re-exports ConditionalDriver for convenience with S3-specific options.
 */
export type { ConditionalDriver } from '../../types.js';
