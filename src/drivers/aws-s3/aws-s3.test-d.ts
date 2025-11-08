/**
 * Type tests for AWS S3 driver conditional types
 * 
 * These tests verify that TypeScript correctly infers available methods
 * based on driver options (readOnly, allowClear).
 * 
 * This file uses TypeScript's type system to verify correctness at compile time.
 * The tests are structured as type assertions that will fail if the types are incorrect.
 * 
 * Note: This file is excluded from normal compilation but can be checked with:
 *   tsc --noEmit src/drivers/aws-s3/aws-s3.test-d.ts
 */

import type { AwsS3DriverOptions } from './types.js';
import type { ConditionalDriver, ReadOnlyDriver, WritableDriver } from '../../types.js';

// Helper to simulate the driver return type
type DriverFromOptions<TOptions extends AwsS3DriverOptions> = ConditionalDriver<TOptions>;

// Test 1: Read-only driver should not have write methods
type ReadOnlyOptions = { bucket: string; readOnly: true };
type ReadOnlyDriverType = DriverFromOptions<ReadOnlyOptions>;

// Verify read-only driver excludes write methods
type TestReadOnlyExcludesSetItem = ReadOnlyDriverType extends { setItem: any } ? never : true;
type TestReadOnlyExcludesRemoveItem = ReadOnlyDriverType extends { removeItem: any } ? never : true;
type TestReadOnlyExcludesClear = ReadOnlyDriverType extends { clear: any } ? never : true;

// Verify read-only driver includes read methods
type TestReadOnlyHasGetItem = ReadOnlyDriverType extends { getItem: any } ? true : never;
type TestReadOnlyHasHasItem = ReadOnlyDriverType extends { hasItem: any } ? true : never;
type TestReadOnlyHasGetKeys = ReadOnlyDriverType extends { getKeys: any } ? true : never;

// Test 2: Driver without allowClear should not have clear method
type NoClearOptions = { bucket: string; allowClear: false };
type NoClearDriverType = DriverFromOptions<NoClearOptions>;

// Verify no clear when allowClear is false
type TestNoClearExcludesClear = NoClearDriverType extends { clear: any } ? never : true;

// Verify write methods are available (setItem, removeItem) but not clear
type TestNoClearHasSetItem = NoClearDriverType extends { setItem: any } ? true : never;
type TestNoClearHasRemoveItem = NoClearDriverType extends { removeItem: any } ? true : never;

// Test 3: Full access driver should have all methods
type FullAccessOptions = { bucket: string; allowClear: true };
type FullAccessDriverType = DriverFromOptions<FullAccessOptions>;

// Verify all methods are available
type TestFullAccessHasSetItem = FullAccessDriverType extends { setItem: any } ? true : never;
type TestFullAccessHasRemoveItem = FullAccessDriverType extends { removeItem: any } ? true : never;
type TestFullAccessHasClear = FullAccessDriverType extends { clear: any } ? true : never;
type TestFullAccessHasGetItem = FullAccessDriverType extends { getItem: any } ? true : never;

// Test 4: getItem should support generics
type GetItemType = ReadOnlyDriverType['getItem'];
type TestGetItemGeneric = GetItemType extends <T = unknown>(key: string, opts?: any) => Promise<T | null> ? true : never;

// Test 5: ConditionalDriver should match ReadOnlyDriver for read-only options
type TestReadOnlyMatches = ReadOnlyDriverType extends ReadOnlyDriver ? true : never;

// Test 6: Full access driver should match WritableDriver
type TestFullAccessMatches = FullAccessDriverType extends WritableDriver ? true : never;

// Compile-time assertions - if any of these resolve to 'never', the types are incorrect
const _typeTests: [
  TestReadOnlyExcludesSetItem,
  TestReadOnlyExcludesRemoveItem,
  TestReadOnlyExcludesClear,
  TestReadOnlyHasGetItem,
  TestReadOnlyHasHasItem,
  TestReadOnlyHasGetKeys,
  TestNoClearExcludesClear,
  TestNoClearHasSetItem,
  TestNoClearHasRemoveItem,
  TestFullAccessHasSetItem,
  TestFullAccessHasRemoveItem,
  TestFullAccessHasClear,
  TestFullAccessHasGetItem,
  TestGetItemGeneric,
  TestReadOnlyMatches,
  TestFullAccessMatches,
] = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];

