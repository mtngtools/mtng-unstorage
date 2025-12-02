/**
 * Flex variant AWS S3 driver types
 * 
 * This file contains types for the flex variant driver.
 * Flex variant types combine common flex types with AWS S3 base types.
 * This file does NOT introduce new fields - it only combines existing types.
 */

import type { StorageValue } from 'unstorage';
import type { Prettify, MTFlexDriverOptions, MTBaseDriverTransactionOptions, ResolvedMTFlexDriverOptions, MTBaseDriverOptions, ResolvedMTBaseDriverOptions } from '../../../types/index.js';
import type { SharedAwsS3DriverOptions } from './types-base.js';
import { StorageKey } from '../../../types/driver-base.js';

/**
 * Flex driver options: MTFlexDriverOptions + S3-specific shared options.
 * 
 * This combines the common flex driver options with AWS S3 base options.
 * No new fields are introduced here - this is purely a type combination.
 */

export type AwsS3FlexDriverOptions<
  TAddlDrvOpts=unknown,
  TUnstorageVal extends StorageValue=StorageValue,
  TNativeStorageVal extends StorageValue=string,
  TAddlTransOpts=unknown,
  TNativeStorageKey extends StorageKey=string,
  TBaseDriverOptions extends MTBaseDriverOptions=MTBaseDriverOptions & SharedAwsS3DriverOptions,
  TResolvedDriverOptions extends ResolvedMTBaseDriverOptions=ResolvedMTBaseDriverOptions & SharedAwsS3DriverOptions,
  TDriverTransOptions extends MTBaseDriverTransactionOptions=MTBaseDriverTransactionOptions,
> = Prettify<
  MTFlexDriverOptions<
    TAddlDrvOpts, 
    TUnstorageVal, 
    TNativeStorageVal, 
    TAddlTransOpts, 
    TNativeStorageKey, 
    TBaseDriverOptions, 
    TResolvedDriverOptions, 
    TDriverTransOptions>
>;

/**
 * Resolved flex driver options for AWS S3.
 * Combines ResolvedMTFlexDriverOptions with S3-specific shared options.
 */
export type ResolvedAwsS3FlexDriverOptions<
  TAddlDrvOpts=unknown,
  TUnstorageVal extends StorageValue = StorageValue,
  TNativeStorageVal extends StorageValue = StorageValue,
  TAddlTransOpts = unknown,
  TNativeStorageKey extends StorageKey=string,
  TResolvedDriverOptions extends ResolvedMTBaseDriverOptions=ResolvedMTBaseDriverOptions & SharedAwsS3DriverOptions,
  TDriverTransOptions extends MTBaseDriverTransactionOptions=MTBaseDriverTransactionOptions,
> = Prettify<
  ResolvedMTFlexDriverOptions<
    TAddlDrvOpts, 
    TUnstorageVal, 
    TNativeStorageVal, 
    TAddlTransOpts, 
    TNativeStorageKey, 
    TResolvedDriverOptions, 
    TDriverTransOptions>
>;

