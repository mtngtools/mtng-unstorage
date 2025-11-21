/**
 * Flex variant driver types
 * 
 * This file contains additional functionality types added by the flex variant.
 * Flex drivers support custom key/value mapping functions.
 */

import type { StorageValue } from "unstorage";
import type { Prettify } from "./helpers.js";
import type { MTBaseDriverOptions, ResolvedMTBaseDriverOptions } from "./driver-base.js";

export type TransformKeyForStorage<
      TDriverOptions=unknown, 
      TInput=string,
      TResult=string | null |undefined,
      > = (key: TInput, resolvedDriverOptions: ResolvedMTFlexDriverOptions & TDriverOptions, requestOpts?: any) => TResult;

export type TransformValueForStorage<
      TDriverOptions=unknown,
      TInput=string,
      TResult=string,
      > = (input: TInput, resolvedDriverOptions: ResolvedMTFlexDriverOptions & TDriverOptions, requestOpts?: any) => TResult | Promise<TResult> | null | undefined;

/**
 * Options added to flex drivers that may provide custom key mapping functions.
 *
 * Mapping rules (type-level):
 * - Mapping functions are optional; both can be omitted.
 * - If `fromStorageKey` is provided, then either `toStorageKey` must also be provided,
 *   or the driver must be configured as `readOnly: true`.
 */
export type MTFlexKeyMappingOptions<
      TDriverOptions=unknown,
      TUnstorageKey=string,
      TNativeStorageKey=string,    
      > = (
  | {
      // no mapping functions
      toStorageKey?: never;
      fromStorageKey?: never;
    }
  | {
      // both mapping functions provided
      fromStorageKey: TransformKeyForStorage<TDriverOptions, TNativeStorageKey, TUnstorageKey>;
      toStorageKey: TransformKeyForStorage<TDriverOptions, TUnstorageKey, TNativeStorageKey>;
    }
  | {
      // readOnly mode: fromStorageKey required; toStorageKey optional
      fromStorageKey: TransformKeyForStorage<TDriverOptions, TNativeStorageKey, TUnstorageKey>;
      toStorageKey?: TransformKeyForStorage<TDriverOptions, TUnstorageKey, TNativeStorageKey>;
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
      TDriverOptions=MTBaseDriverOptions & unknown,
      TUnstorageValue extends StorageValue=StorageValue,
      TNativeStorageValue extends StorageValue=string,
      > = (
  | {
      toStorageValue?: never;
      fromStorageValue?: never;
    }
  | {
      fromStorageValue: TransformValueForStorage<TDriverOptions, TNativeStorageValue, TUnstorageValue>;
      toStorageValue: TransformValueForStorage<TDriverOptions, TUnstorageValue, TNativeStorageValue>;
    }
    | {
      fromStorageValue: TransformValueForStorage<TDriverOptions, TNativeStorageValue, TUnstorageValue>;
      toStorageValue?: TransformValueForStorage<TDriverOptions, TUnstorageValue, TNativeStorageValue>;
      readOnly: true;
    }
);

export type MTFlexDriverOptions<
      TDriverOptions=unknown,
      TUnstorageValue extends StorageValue=StorageValue,
      TNativeStorageValue extends StorageValue=string,
      > = Prettify<MTBaseDriverOptions
        & MTFlexKeyMappingOptions<TDriverOptions, string, string>
        & MTFlexValueMappingOptions<TDriverOptions, TUnstorageValue, TNativeStorageValue>
      >;

/**
 * Resolved options passed to flex mapping functions.
 * Contains canonical driver fields the mapper may need (base and storagePrefix)
 * plus any other validated fields.
 */
export type ResolvedMTFlexDriverOptions<
      TDriverOptions=unknown,
      TUnstorageValue extends StorageValue=StorageValue,
      TNativeStorageValue extends StorageValue=string,
      > = Prettify<ResolvedMTBaseDriverOptions
          & MTFlexKeyMappingOptions<TDriverOptions, string, string>
          & MTFlexValueMappingOptions<TDriverOptions, TUnstorageValue, TNativeStorageValue>
      >;

