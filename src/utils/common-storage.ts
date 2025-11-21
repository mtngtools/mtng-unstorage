/**
 * Storage-specific common utilities
 * 
 * This file contains utilities that are specific to storage operations and
 * are used by all drivers regardless of provider or variant.
 */

import type { MTBaseDriverOptions, MTBaseDriverRequestOptions, ResolvedMTBaseDriverOptions } from '../types/index.js';

/**
 * Validates that a key is safe for storage
 */
export function validateKey(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new Error('Key must be a non-empty string');
  }
  
  if (key.includes('..')) {
    throw new Error('Key cannot contain ".." path segments');
  }
}

/**
 * Normalize and validate generic driver options that are common to all drivers.
 * This central helper extracts defaults for `base`, `storagePrefix` (with
 * legacy `s3StoragePrefix` fallback), `name`, `readOnly`, and `allowClear`.
 */
export function validateBaseDriverOptions(
  opts: MTBaseDriverOptions
): Omit<ResolvedMTBaseDriverOptions, 'fullBasePrefix'> {
  return {
    base: opts.base ?? '',
    storagePrefix: opts.storagePrefix ?? '',
    name: opts.name ?? 'namenotset',
    readOnly: opts.readOnly ?? false,
    allowClear: opts.allowClear ?? false,
  } as Omit<ResolvedMTBaseDriverOptions, 'fullBasePrefix'>; // fullBasePrefix is computed by caller
}

/**
 * Filters a key by maxDepth, counting ':' separators
 * @deprecated use unstorage version
 */
export function filterKeyByDepth(key: string, maxDepth: number | undefined): boolean {
  if (maxDepth === undefined) {
    return true;
  }

  // Count occurrences of ':'
  const count = key.split(':').length - 1;
  return count <= maxDepth;
}

/**
 * Filters a key by maxDepth, determining maxDepth from driver and request options
 */
export const filterKeyByDepthByOptions = (
  key: string,
  resolvedDriverOptions: MTBaseDriverOptions,
  requestOpts?: MTBaseDriverRequestOptions,
  ) => filterKeyByDepth(key, requestOpts?.maxDepth ?? resolvedDriverOptions.maxDepth ?? undefined);

/**
 * Clear helper that lists keys and removes them in batches.
 * Callers provide driver-specific getKeys and removeItem functions.
 * TODO add batchSize as driver and request option
 */
export async function clearByListingAndBatching(args: {
  opts: any;
  baseToClear: string;
  resolvedDriverOptions?: ResolvedMTBaseDriverOptions;
  getKeys: (base: string, opts: any) => Promise<string[]>;
  removeItem: (key: string, opts: any) => Promise<void>;
  batchSize?: number;
}): Promise<void> {
  const { opts, baseToClear, getKeys, removeItem, batchSize = 100 } = args;

  const keys = await getKeys(baseToClear || '', opts);

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    await Promise.all(batch.map((key: string) => removeItem(key, opts)));
  }
}

