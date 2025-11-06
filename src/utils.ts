/**
 * Utility functions for storage drivers
 * Following unstorage repository standards
 */

import { destr } from 'destr';
import type { AwsRegionAndCredentials, MTBaseDriverOptions, MTBaseDriverRequestOptions, ResolvedMTBaseDriverOptions, ResolvedMTFlexDriverOptions } from './types';

/**
 * Helper to check if value is primitive
 */
function isPrimitive(value: any): boolean {
  const type = typeof value;
  return value === null || (type !== 'object' && type !== 'function');
}

/**
 * Helper to check if value is pure object
 */
function isPureObject(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return !proto || Object.prototype.isPrototypeOf.call(proto, Object);
}

/**
 * Converts a value to a string for storage
 * Follows unstorage stringify implementation from _utils.ts
 */
export function serialize(value: unknown): string {
  if (isPrimitive(value)) {
    return String(value);
  }

  if (isPureObject(value) || Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      throw new Error('[unstorage] Cannot stringify value!');
    }
  }

  if (typeof (value as any).toJSON === 'function') {
    return serialize((value as any).toJSON());
  }

  throw new Error('[unstorage] Cannot stringify value!');
}

/**
 * Attempts to deserialize a stored string value
 * Uses destr library for safe deserialization like unstorage
 */
export function deserialize(value: string): unknown {
  return destr(value);
}

/**
 * Encode helper: if value looks like a plain object or array, JSON stringify, otherwise cast to string.
 * Kept minimal and dependency-light; mirrors serialize semantics but returns string or throws.
 */
export function encodeValueToJSONIfObject(value: unknown): string {
  if (isPrimitive(value)) return String(value);
  if (isPureObject(value) || Array.isArray(value)) return JSON.stringify(value);
  if (typeof (value as any)?.toJSON === 'function') return encodeValueToJSONIfObject((value as any).toJSON());
  return String(value as any);
}

/**
 * Decode helper: if the input is a string that looks like JSON, parse using destr; otherwise return as-is.
 */
export function decodeJSONIfApplicable<T = unknown>(value: unknown): T | unknown {
  if (typeof value === 'string') {
    return destr(value) as T;
  }
  return value as T;
}

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
 * Filters a key by maxDepth, counting ':' separators
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
  resolvedDriverOptions: ResolvedMTFlexDriverOptions,
  requestOpts?: MTBaseDriverRequestOptions,
  ) => filterKeyByDepth(key, requestOpts?.maxDepth ?? resolvedDriverOptions.maxDepth ?? undefined);

/**
 * Throws when the driver is in read-only mode.
 *
 * Usage: call with the driver-level `readOnly` flag and the operation name.
 */
export function checkReadOnly(readOnly: boolean, operation: string): void {
  if (readOnly) {
    throw new Error(`Cannot perform ${operation}: driver is in read-only mode`);
  }
}

/**
 * Resolved base driver options — canonicalized defaults applied.
 * Fields that drivers rely on at runtime (set by validation helpers) are
 * marked required here so callers implementing mapping functions can rely
 * on them being present.
 */


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

export function validateAWSRegionAndCredentials(
  opts: AwsRegionAndCredentials
): AwsRegionAndCredentials {
  
  return {
    ...(opts.region ? { region: opts.region } : {}),
    ...(opts.accessKeyId ? { accessKeyId: opts.accessKeyId } : {}),
    ...(opts.secretAccessKey ? { secretAccessKey: opts.secretAccessKey } : {}),
    ...(opts.sessionToken ? { sessionToken: opts.sessionToken } : {}),
  } as AwsRegionAndCredentials;
}


/**
 * Converts buffer/stream data to string.
 */
export async function streamToString(stream: any): Promise<string> {
  if (!stream) return '';

  if (typeof stream === 'string') return stream;

  if (stream.transformToString) {
    return await stream.transformToString();
  }

  // Handle Node.js streams
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

/**
 * Clear helper that lists keys and removes them in batches.
 * Callers provide driver-specific getKeys and removeItem functions.
 */
export async function clearByListingAndBatching(args: {
  opts: any;
  baseToClear: string;
  resolvedDriverOptions: ResolvedMTBaseDriverOptions;
  getKeys: (base: string, opts: any) => Promise<string[]>;
  removeItem: (key: string, opts: any) => Promise<void>;
  batchSize?: number;
}): Promise<void> {
  const { opts, baseToClear, resolvedDriverOptions, getKeys, removeItem, batchSize = 100 } = args;
  const { readOnly, allowClear } = resolvedDriverOptions;

  checkReadOnly(readOnly, 'clear');

  if (!allowClear) {
    throw new Error('Cannot perform clear: allowClear option must be set to true');
  }

  const keys = await getKeys(baseToClear || '', opts);

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    await Promise.all(batch.map((key: string) => removeItem(key, opts)));
  }
}