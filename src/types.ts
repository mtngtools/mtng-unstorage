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

/**
 * Options added to flex drivers that may provide custom key mapping functions.
 *
 * Mapping rules (type-level):
 * - Either provide no mapping functions, or provide both `toStorageKey` and `fromStorageKey`.
 * - Exception: if `readOnly: true`, `fromStorageKey` may be omitted when `toStorageKey` is provided.
 */
export type MTFlexAdditionalDriverOptions = (
  | {
      // no mapping functions
      toStorageKey?: never;
      fromStorageKey?: never;
    }
  | {
      // both mapping functions provided
      toStorageKey: (key: string, resolvedDriverOptions: ResolvedMTFlexDriverOptions, requestOpts?: MTBaseDriverRequestOptions) => string;
      fromStorageKey: (key: string, resolvedDriverOptions: ResolvedMTFlexDriverOptions, requestOpts?: MTBaseDriverRequestOptions) => string;
    }
  | {
      // readOnly mode: toStorageKey provided but fromStorageKey optional
      toStorageKey: (key: string, resolvedDriverOptions: ResolvedMTFlexDriverOptions, requestOpts?: MTBaseDriverRequestOptions) => string;
      fromStorageKey?: (key: string, resolvedDriverOptions: ResolvedMTFlexDriverOptions, requestOpts?: MTBaseDriverRequestOptions) => string;
      readOnly: true;
    }
);

export type MTFlexDriverOptions = MTBaseDriverOptions & MTFlexAdditionalDriverOptions;

/**
 * Resolved options passed to flex mapping functions.
 * Contains canonical driver fields the mapper may need (base and storagePrefix)
 * plus any other validated fields.
 */
export type ResolvedMTFlexDriverOptions = Prettify<ResolvedMTBaseDriverOptions & MTFlexAdditionalDriverOptions>;

export type MTBaseDriverRequestOptions = {
  /**
   * Maximum depth of keys (number of ':' separators). Undefined means no limit.
   */
  maxDepth?: number
}