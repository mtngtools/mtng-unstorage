/**
 * Flex variant driver types
 * 
 * This file contains additional functionality types added by the flex variant.
 * Flex drivers support custom key/value mapping functions.
 */

import type { StorageValue } from "unstorage";
import type { Prettify } from "./helpers.js";
import type { MTBaseDriverOptions, ResolvedMTBaseDriverOptions, MTBaseDriverTransactionOptions, StorageKey } from "./driver-base.js";

/**
 * Options added to flex drivers that may provide custom key mapping functions.
 *
 * Mapping rules (type-level):
 * - Mapping functions are optional; both can be omitted.
 * - If `fromStorageKey` is provided, then either `toStorageKey` must also be provided,
 *   or the driver must be configured as `readOnly: true`.
 */
export type MTFlexKeyMappingOptions<
      TAddlTransOpts=MTBaseDriverTransactionOptions,
      TNativeStorageKey extends StorageKey=string,
      TResolvedDriverOptions extends ResolvedMTBaseDriverOptions=ResolvedMTBaseDriverOptions,
      TDriverTransOptions extends MTBaseDriverTransactionOptions=MTBaseDriverTransactionOptions,
      > = (
  | {
      // no mapping functions
      toStorageKey?: never;
      fromStorageKey?: never;
    }
  | {
      // both mapping functions provided
      fromStorageKey: (params: {
        key: TNativeStorageKey;
        resolvedDriverOptions: TResolvedDriverOptions;
        transactionOptions?: TDriverTransOptions & TAddlTransOpts;
      }) => string;      
      toStorageKey: (params: {
        key: string;
        resolvedDriverOptions: TResolvedDriverOptions;
        transactionOptions?: TDriverTransOptions & TAddlTransOpts;
      }) => TNativeStorageKey;
    }
  | {
      // readOnly mode: fromStorageKey required; toStorageKey optional
      fromStorageKey: (params: {
        key: TNativeStorageKey;
        resolvedDriverOptions: TResolvedDriverOptions;
        transactionOptions?: TDriverTransOptions & TAddlTransOpts;
      }) => string;      
      toStorageKey?: (params: {
        key: string;
        resolvedDriverOptions: TResolvedDriverOptions;
        transactionOptions?: TDriverTransOptions & TAddlTransOpts;
      }) => TNativeStorageKey;
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
      TUnstorageVal extends StorageValue=StorageValue,
      TNativeStorageVal extends StorageValue=string,
      TAddlTransOpts=MTBaseDriverTransactionOptions,
      TResolvedDriverOptions extends ResolvedMTBaseDriverOptions=ResolvedMTBaseDriverOptions,
      TDriverTransOptions extends MTBaseDriverTransactionOptions=MTBaseDriverTransactionOptions,
      > = (
  | {
      toStorageValue?: never;
      fromStorageValue?: never;
    }
  | {
      fromStorageValue: (params: {
        input: TNativeStorageVal;
        resolvedDriverOptions: TResolvedDriverOptions;
        transactionOptions?: TDriverTransOptions & TAddlTransOpts;
        }) => TUnstorageVal | Promise<TUnstorageVal> | null | undefined;
      toStorageValue: (params: {
        input: TUnstorageVal;
        resolvedDriverOptions: TResolvedDriverOptions;
        transactionOptions?: TDriverTransOptions & TAddlTransOpts;
        }) => TNativeStorageVal | Promise<TNativeStorageVal> | null | undefined;
    }
    | {
      fromStorageValue: (params: {
        input: TNativeStorageVal;
        resolvedDriverOptions: TResolvedDriverOptions;
        transactionOptions?: TDriverTransOptions & TAddlTransOpts;
        }) => TUnstorageVal | Promise<TUnstorageVal> | null | undefined;
      toStorageValue?: (params: {
        input: TUnstorageVal;
        resolvedDriverOptions: TResolvedDriverOptions;
        transactionOptions?: TDriverTransOptions & TAddlTransOpts;
        }) => TNativeStorageVal | Promise<TNativeStorageVal> | null | undefined;
      readOnly: true;
    }
);

export type MTFlexDriverOptions<
      TAddlDrvOpts=unknown,
      TUnstorageVal extends StorageValue=StorageValue,
      TNativeStorageVal extends StorageValue=string,
      TAddlTransOpts=unknown,
      TNativeStorageKey extends StorageKey=string,
      TBaseDriverOptions extends MTBaseDriverOptions=MTBaseDriverOptions,
      TResolvedDriverOptions extends ResolvedMTBaseDriverOptions=ResolvedMTBaseDriverOptions,
      TDriverTransOptions extends MTBaseDriverTransactionOptions=MTBaseDriverTransactionOptions,
      > = Prettify<TBaseDriverOptions
        & TAddlDrvOpts
        & MTFlexKeyMappingOptions<TAddlTransOpts, TNativeStorageKey, TResolvedDriverOptions, TDriverTransOptions>
        & MTFlexValueMappingOptions<TUnstorageVal, TNativeStorageVal, TAddlTransOpts, TResolvedDriverOptions, TDriverTransOptions>
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
      TNativeStorageKey extends StorageKey=string,
      TResolvedDriverOptions extends ResolvedMTBaseDriverOptions=ResolvedMTBaseDriverOptions,
      TDriverTransOptions extends MTBaseDriverTransactionOptions=MTBaseDriverTransactionOptions,
      > = Prettify<TResolvedDriverOptions
          & TAddlDrvOpts
          & MTFlexKeyMappingOptions<TAddlTransOpts, TNativeStorageKey, TResolvedDriverOptions, TDriverTransOptions>
          & MTFlexValueMappingOptions<TUnstorageVal, TNativeStorageVal, TAddlTransOpts, TResolvedDriverOptions, TDriverTransOptions>
        >;

