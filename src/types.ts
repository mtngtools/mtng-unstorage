import { StorageValue, type Driver } from "unstorage";

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Configuration options that all drivers should support
 */
export type  MTBaseDriverOptions = {
  /**
   * Base path prefix for all keys 
   */
  base?: string
  
  /**
   * Preferred storage prefix for drivers. New name replacing legacy `s3StoragePrefix`.
   * If both are supplied, `storagePrefix` takes precedence and `s3StoragePrefix` is used
   * only for backwards compatibility.
   */
  storagePrefix?: string
  
  /**
   * Driver name for debugging
   */
  name?: string
  
  /**
   * When true, prevents write operations (setItem, removeItem, clear)
   */
  readOnly?: boolean
  
  /**
   * When true, allows the clear method to be called. Defaults to false for safety.
   */
  allowClear?: boolean

  /**
   * Maximum depth of keys (number of ':' separators). Undefined means no limit.
   */
  maxDepth?: number

}

/**
 * AWS region and inline credential options shared across drivers.
 *
 * Rules (with exactOptionalPropertyTypes in mind):
 * - Either provide both accessKeyId and secretAccessKey (sessionToken optional),
 *   or provide none of the three.
 * - Supplying only one of the pair is disallowed.
 * - Supplying sessionToken without the pair is disallowed.
 */
export type AwsRegionAndCredentials = {
  /** Optional AWS region used when constructing an internal client */
  region?: string;
} & (
  | {
      accessKeyId: string;
      secretAccessKey: string;
      /** Optional session token for temporary credentials */
      sessionToken?: string;
    }
  | {
      accessKeyId?: never;
      secretAccessKey?: never;
      sessionToken?: never;
    }
);

/**
 * Resolved base driver options — canonicalized defaults applied.
 * Fields that drivers rely on at runtime (set by validation helpers) are
 * marked required here so callers implementing mapping functions can rely
 * on them being present.
 */
export type ResolvedMTBaseDriverOptions = Prettify<MTBaseDriverOptions
      & Required<Pick<MTBaseDriverOptions, 'base' | 'storagePrefix' | 'name' | 'readOnly' | 'allowClear'>> & {
  fullBasePrefix: string; //combines base and storagePrefix
}>;

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

export type MTBaseDriverRequestOptions = {
  /**
   * Maximum depth of keys (number of ':' separators). Undefined means no limit.
   */
  maxDepth?: number
}

/**
 * Base driver interface with all possible methods.
 * This represents the full set of methods a driver can implement.
 */
export type BaseDriverMethods = {
  name: string;
  flags: { maxDepth: boolean };
  hasItem: (key: string, opts?: MTBaseDriverRequestOptions) => Promise<boolean>;
  getItem: <T = unknown>(key: string, opts?: MTBaseDriverRequestOptions) => Promise<T | null>;
  getKeys: (basePrefix: string, opts?: MTBaseDriverRequestOptions) => Promise<string[]>;
  setItem?: (key: string, value: string, opts?: MTBaseDriverRequestOptions) => Promise<void>;
  removeItem?: (key: string, opts?: MTBaseDriverRequestOptions) => Promise<void>;
  clear?: (base: string, opts?: MTBaseDriverRequestOptions) => Promise<void>;
};

/**
 * Helper type to extract boolean value (handles both optional and required booleans)
 */
type BooleanValue<T> = T extends boolean ? T : T extends true ? true : false;

/**
 * Conditional driver type that infers available methods based on driver options.
 * 
 * - If `readOnly` is true: excludes `setItem`, `removeItem`, and `clear`
 * - If `allowClear` is false or undefined: excludes `clear` (unless readOnly is true)
 * - Otherwise: includes all methods
 * 
 * Works with both input options (optional booleans) and resolved options (required booleans).
 * 
 * @template TOptions - The driver options type (must extend MTBaseDriverOptions or ResolvedMTBaseDriverOptions)
 */
export type ConditionalDriver<TOptions extends { readOnly?: boolean; allowClear?: boolean } | { readOnly: boolean; allowClear: boolean }> = 
  BooleanValue<TOptions['readOnly']> extends true
    ? Omit<BaseDriverMethods, 'setItem' | 'removeItem' | 'clear'>
    : BooleanValue<TOptions['allowClear']> extends true
    ? BaseDriverMethods
    : Omit<BaseDriverMethods, 'clear'>;

/**
 * Type for a read-only driver (no write methods).
 */
export type ReadOnlyDriver = Omit<BaseDriverMethods, 'setItem' | 'removeItem' | 'clear'>;

/**
 * Type for a writable driver with all methods (including clear).
 */
export type WritableDriver = BaseDriverMethods;

/**
 * Type for a writable driver without clear method.
 */
export type WritableDriverWithoutClear = Omit<BaseDriverMethods, 'clear'>;

/**
 * Driver factory type: a function that takes options and returns a Driver instance.
 * This matches the internal type used by `defineDriver` from unstorage.
 * Note: unstorage doesn't export this type, so we declare it here.
 * 
 * @template OptionsT - The driver options type
 * @template InstanceT - The driver instance type (typically `never` for stateless drivers)
 */
export type DriverFactory<OptionsT = any, InstanceT = never> = (opts: OptionsT) => Driver<OptionsT, InstanceT>;

export type MTDriverType = 'base' | 'flex' | 'versioned';