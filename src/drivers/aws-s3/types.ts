import type { MTBaseDriverOptions } from '../../types';
import type { S3Client } from '@aws-sdk/client-s3';

/**
 * Generic flex driver options alias that currently equals MTBaseDriverOptions.
 * This is the extension point for non-breaking flex-specific options later.
 */
export type MTFlexDriverOptions = MTBaseDriverOptions;

/**
 * Shared S3-specific options used by both the basic and flex drivers.
 */
export type SharedAwsS3DriverOptions = {
  /**
   * AWS S3 client instance
   */
  s3Client: S3Client;

  /**
   * S3 bucket name
   */
  bucket: string;

  /**
   * Optional S3 storage prefix for all keys in the bucket
   */
  s3StoragePrefix?: string;
}

/**
 * Flex driver options: MTFlexDriverOptions + S3-specific shared options.
 */
export type AwsS3FlexDriverOptions = MTFlexDriverOptions & SharedAwsS3DriverOptions;

export default {} as const;
