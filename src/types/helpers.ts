/**
 * Generic TypeScript helpers
 * 
 * These are generic TypeScript utility types that have nothing to do with this package.
 * They're included here as reusable type utilities.
 */

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Helper type to extract boolean value (handles both optional and required booleans)
 */
export type BooleanValue<T> = T extends boolean ? T : T extends true ? true : false;

