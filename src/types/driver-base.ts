/**
 * Base driver types
 * 
 * This file contains base functionality types for all drivers (base variant).
 * These types define the core driver interface and options that all drivers share.
 */

import type { Driver } from "unstorage";
import type { Prettify, BooleanValue } from "./helpers.js";

/**
 * Configuration options that all drivers should support
 */
export type MTBaseDriverOptions = {
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
 * Resolved base driver options — canonicalized defaults applied.
 * Fields that drivers rely on at runtime (set by validation helpers) are
 * marked required here so callers implementing mapping functions can rely
 * on them being present.
 */
export type ResolvedMTBaseDriverOptions = Prettify<MTBaseDriverOptions
      & Required<Pick<MTBaseDriverOptions, 'base' | 'storagePrefix' | 'name' | 'readOnly' | 'allowClear'>> & {
  fullBasePrefix: string; //combines base and storagePrefix
}>;

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

