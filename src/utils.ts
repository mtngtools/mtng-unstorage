/**
 * Utility functions for storage drivers
 * Following unstorage repository standards
 */

import { destr } from 'destr';

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