/**
 * Flex variant driver types
 * 
 * This file contains additional functionality types added by the flex variant.
 * Flex drivers support custom key/value mapping functions.
 */

import type { StorageValue } from "unstorage";
import type { Prettify } from "./helpers.js";
import type { MTBaseDriverOptions, ResolvedMTBaseDriverOptions, MTBaseDriverTransactionOptions } from "./driver-base.js";

export type TransformKeyForStorage<
      TAddlDrvOpts=unknown, 
      TInput=string,
      TResult=string | null |undefined,
      TAddlTransOpts=MTBaseDriverTransactionOptions,
      > = (params: {
        key: TInput;
        resolvedDriverOptions: ResolvedMTFlexDriverOptions<TAddlDrvOpts, string, string, TAddlTransOpts> & TAddlDrvOpts;
        transactionOptions?: MTBaseDriverTransactionOptions & TAddlTransOpts;
      }) => TResult;

export type TransformValueForStorage<
      TAddlDrvOpts=unknown,
      TInput extends StorageValue=string,
      TResult extends StorageValue=string,
      TAddlTransOpts=MTBaseDriverTransactionOptions,
      > = (params: {
        input: TInput;
        resolvedDriverOptions: ResolvedMTFlexDriverOptions<TAddlDrvOpts, TResult, TInput, TAddlTransOpts> & TAddlDrvOpts;
        transactionOptions?: MTBaseDriverTransactionOptions & TAddlTransOpts;
      }) => TResult | Promise<TResult> | null | undefined;

/**
 * Options added to flex drivers that may provide custom key mapping functions.
 *
 * Mapping rules (type-level):
 * - Mapping functions are optional; both can be omitted.
 * - If `fromStorageKey` is provided, then either `toStorageKey` must also be provided,
 *   or the driver must be configured as `readOnly: true`.
 */
export type MTFlexKeyMappingOptions<
      TAddlDrvOpts=unknown,
      TUnstorageKey=string,
      TNativeStorageKey=string,
      TAddlTransOpts=MTBaseDriverTransactionOptions,
      > = (
  | {
      // no mapping functions
      toStorageKey?: never;
      fromStorageKey?: never;
    }
  | {
      // both mapping functions provided
      fromStorageKey: TransformKeyForStorage<TAddlDrvOpts, TNativeStorageKey, TUnstorageKey, TAddlTransOpts>;
      toStorageKey: TransformKeyForStorage<TAddlDrvOpts, TUnstorageKey, TNativeStorageKey, TAddlTransOpts>;
    }
  | {
      // readOnly mode: fromStorageKey required; toStorageKey optional
      fromStorageKey: TransformKeyForStorage<TAddlDrvOpts, TNativeStorageKey, TUnstorageKey, TAddlTransOpts>;
      toStorageKey?: TransformKeyForStorage<TAddlDrvOpts, TUnstorageKey, TNativeStorageKey, TAddlTransOpts>;
      readOnly: true;
    }
);

/**
 * Options added to flex drivers for value mapping functions.
 *
 * Value mapping runs on raw storage values (strings) read/written by the driver:
 * - `toStorageValue` transforms the serialized string before writing to storage
 * - `fromStorageValue` transforms the raw string read from storage into a typed value
 *
 * Mapping rules (type-level):
 * - Mapping functions are optional; both can be omitted.
 * - If `fromStorageValue` is provided, then either `toStorageValue` must also be provided,
 *   or the driver must be configured as `readOnly: true`.
 */
export type MTFlexValueMappingOptions<
      TAddlDrvOpts=MTBaseDriverOptions & unknown,
      TUnstorageVal extends StorageValue=StorageValue,
      TNativeStorageVal extends StorageValue=string,
      TAddlTransOpts=MTBaseDriverTransactionOptions,
      > = (
  | {
      toStorageValue?: never;
      fromStorageValue?: never;
    }
  | {
      fromStorageValue: TransformValueForStorage<TAddlDrvOpts, TNativeStorageVal, TUnstorageVal, TAddlTransOpts>;
      toStorageValue: TransformValueForStorage<TAddlDrvOpts, TUnstorageVal, TNativeStorageVal, TAddlTransOpts>;
    }
    | {
      fromStorageValue: TransformValueForStorage<TAddlDrvOpts, TNativeStorageVal, TUnstorageVal, TAddlTransOpts>;
      toStorageValue?: TransformValueForStorage<TAddlDrvOpts, TUnstorageVal, TNativeStorageVal, TAddlTransOpts>;
      readOnly: true;
    }
);

export type MTFlexDriverOptions<
      TAddlDrvOpts=unknown,
      TUnstorageVal extends StorageValue=StorageValue,
      TNativeStorageVal extends StorageValue=string,
      TAddlTransOpts=MTBaseDriverTransactionOptions,
      > = Prettify<MTBaseDriverOptions
        & MTFlexKeyMappingOptions<TAddlDrvOpts, string, string, TAddlTransOpts>
        & MTFlexValueMappingOptions<TAddlDrvOpts, TUnstorageVal, TNativeStorageVal, TAddlTransOpts>
      >;

/**
 * Resolved options passed to flex mapping functions.
 * Contains canonical driver fields the mapper may need (base and storagePrefix)
 * plus any other validated fields.
 */
export type ResolvedMTFlexDriverOptions<
      TAddlDrvOpts=unknown,
      TUnstorageVal extends StorageValue=StorageValue,
      TNativeStorageVal extends StorageValue=string,
      TAddlTransOpts=MTBaseDriverTransactionOptions,
      > = Prettify<ResolvedMTBaseDriverOptions
          & MTFlexKeyMappingOptions<TAddlDrvOpts, string, string, TAddlTransOpts>
          & MTFlexValueMappingOptions<TAddlDrvOpts, TUnstorageVal, TNativeStorageVal, TAddlTransOpts>
      >;

