/**
 * Configuration options that all drivers should support
 */
export type  MTBaseDriverOptions = {
  /**
   * Base path prefix for all keys 
   */
  base?: string
  
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