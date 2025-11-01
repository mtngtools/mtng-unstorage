import type { AwsS3FlexDriverOptions } from './types';
import awsS3Driver from './aws-s3.js';
import { toStorageKey as _toStorageKey } from './aws-s3.js';

export function toStorageKey(key: string, opts: { base?: string; s3StoragePrefix?: string } = {}): string {
  // Re-export the same helper for parity with the basic driver
  return _toStorageKey(key as string, opts as any);
}

/**
 * AwsS3FlexDriver (phase 1)
 * Delegates to the existing `aws-s3` driver implementation to provide
 * exact parity. Future changes will add flex hooks and configuration.
 */
export default function awsS3FlexDriver(options: AwsS3FlexDriverOptions) {
  // Ensure a distinct default name for the flex driver while keeping behavior
  // identical by delegating to the existing implementation.
  const opts = { ...(options as any), name: (options as any).name ?? 'aws-s3-flex' };
  return (awsS3Driver as any)(opts);
}

export { awsS3FlexDriver as AwsS3FlexDriver };
