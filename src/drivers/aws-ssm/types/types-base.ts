/**
 * Base AWS SSM driver types
 *
 * This file contains base AWS SSM-specific types used by the base variant driver.
 */

import type { SSMClient } from '@aws-sdk/client-ssm';
import type { AwsRegionAndCredentials, Prettify, MTBaseDriverOptions, MTBaseDriverTransactionOptions, ResolvedMTBaseDriverOptions } from '../../../types/index.js';

/**
 * SSM-specific options: optional pre-configured client and withDecryption. No bucket (unlike S3).
 */
export type SharedAwsSsmDriverOptionsBase = {
  /**
   * AWS SSM client instance. If omitted, the driver will construct one.
   */
  ssmClient?: SSMClient;
  /**
   * When true, decrypt SecureString parameters when reading. Defaults to true.
   * Can be overridden per request via the operation's options.
   */
  withDecryption?: boolean;
  // storagePrefix from MTBaseDriverOptions; no ssmStoragePrefix legacy.
};

/**
 * Request/transaction options for SSM read operations. Extends base transaction options.
 */
export type MTSSMDriverTransactionOptions = MTBaseDriverTransactionOptions & {
  /**
   * Override driver-level withDecryption for this request. When undefined, driver default is used.
   */
  withDecryption?: boolean;
};

export type SharedAwsSsmDriverOptions = SharedAwsSsmDriverOptionsBase & AwsRegionAndCredentials;

/**
 * User-facing driver options
 */
export type AwsSsmDriverOptions = Prettify<MTBaseDriverOptions & SharedAwsSsmDriverOptions>;

/**
 * Resolved options (defaults applied)
 */
export type ResolvedAwsSsmDriverOptions = Prettify<ResolvedMTBaseDriverOptions & SharedAwsSsmDriverOptions>;

/**
 * Validated options returned by validateSsmOptions (ssmClient and withDecryption default applied).
 */
export type ResolvedAWSSSMDriverOptions = Prettify<
  ResolvedMTBaseDriverOptions
  & SharedAwsSsmDriverOptionsBase
  & { ssmClient: SSMClient; withDecryption: boolean }
  & AwsRegionAndCredentials
>;

export const AWS_SSM_DRIVER_NAME = 'aws-ssm' as const;

/**
 * Conditional driver type for AWS SSM driver based on options.
 */
export type { ConditionalDriver } from '../../../types/index.js';
