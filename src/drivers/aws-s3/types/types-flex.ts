/**
 * Flex variant AWS S3 driver types
 * 
 * This file contains types for the flex variant driver.
 * Flex variant types combine common flex types with AWS S3 base types.
 * This file does NOT introduce new fields - it only combines existing types.
 */

import type { StorageValue } from 'unstorage';
import type { Prettify, MTFlexDriverOptions } from '../../../types/index.js';
import type { SharedAwsS3DriverOptions } from './types-base.js';

/**
 * Flex driver options: MTFlexDriverOptions + S3-specific shared options.
 * 
 * This combines the common flex driver options with AWS S3 base options.
 * No new fields are introduced here - this is purely a type combination.
 */
export type AwsS3FlexDriverOptions<
  TDriverOptions = unknown,
  TUnstorageValue extends StorageValue = StorageValue,
  TNativeStorageValue extends StorageValue = StorageValue,
> = Prettify<
  SharedAwsS3DriverOptions
  & MTFlexDriverOptions<TDriverOptions, TUnstorageValue, TNativeStorageValue>
>;

