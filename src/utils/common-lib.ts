/**
 * Common library utilities
 * 
 * These are functions that normally would be in a core library that you import
 * as a package and not have everywhere. We're including them in this package only
 * to avoid having external dependencies. There's nothing special about them being
 * here. It's just that we don't want to have a dependency on another package.
 */

import { destr } from 'destr';

/**
 * Serialize helper: canonicalize any value to a JSON string using JSON.stringify.
 * Drivers will write values using this canonical serializer.
 */
export function serialize(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Decode helper: if the input is a string that looks like JSON, parse using destr; otherwise return as-is.
 */
export function deserialize<T = unknown>(value: unknown): T | unknown {
  if (typeof value === 'string') {
    return destr(value) as T;
  }
  return value as T;
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

