/**
 * Flex variant AWS SSM driver types
 *
 * Combines common flex types with AWS SSM base types. No new fields; type combination only.
 */

import type { StorageValue } from 'unstorage';
import type {
  Prettify,
  MTFlexDriverOptions,
  ResolvedMTFlexDriverOptions,
  MTBaseDriverOptions,
  ResolvedMTBaseDriverOptions,
} from '../../../types/index.js';
import type { SharedAwsSsmDriverOptions } from './types-base.js';
import type { MTSSMDriverTransactionOptions } from './types-base.js';
import type { StorageKey } from '../../../types/driver-base.js';

/**
 * Flex driver options: MTFlexDriverOptions + SSM-specific shared options.
 */
export type AwsSsmFlexDriverOptions<
  TAddlDrvOpts = unknown,
  TUnstorageVal extends StorageValue = StorageValue,
  TNativeStorageVal extends StorageValue = string,
  TAddlTransOpts = unknown,
  TNativeStorageKey extends StorageKey = string,
  TBaseDriverOptions extends MTBaseDriverOptions = MTBaseDriverOptions & SharedAwsSsmDriverOptions,
  TResolvedDriverOptions extends ResolvedMTBaseDriverOptions = ResolvedMTBaseDriverOptions & SharedAwsSsmDriverOptions,
  TDriverTransOptions extends MTSSMDriverTransactionOptions = MTSSMDriverTransactionOptions,
> = Prettify<
  MTFlexDriverOptions<
    TAddlDrvOpts,
    TUnstorageVal,
    TNativeStorageVal,
    TAddlTransOpts,
    TNativeStorageKey,
    TBaseDriverOptions,
    TResolvedDriverOptions,
    TDriverTransOptions
  >
>;

export type PartialAwsSsmFlexDriverOptions = Partial<AwsSsmFlexDriverOptions>;

/**
 * Resolved flex driver options for AWS SSM.
 */
export type ResolvedAwsSsmFlexDriverOptions<
  TAddlDrvOpts = unknown,
  TUnstorageVal extends StorageValue = StorageValue,
  TNativeStorageVal extends StorageValue = StorageValue,
  TAddlTransOpts = unknown,
  TNativeStorageKey extends StorageKey = string,
  TResolvedDriverOptions extends ResolvedMTBaseDriverOptions = ResolvedMTBaseDriverOptions & SharedAwsSsmDriverOptions,
  TDriverTransOptions extends MTSSMDriverTransactionOptions = MTSSMDriverTransactionOptions,
> = Prettify<
  ResolvedMTFlexDriverOptions<
    TAddlDrvOpts,
    TUnstorageVal,
    TNativeStorageVal,
    TAddlTransOpts,
    TNativeStorageKey,
    TResolvedDriverOptions,
    TDriverTransOptions
  >
>;

export const AWS_SSM_FLEX_DRIVER_NAME = 'aws-ssm-flex' as const;
