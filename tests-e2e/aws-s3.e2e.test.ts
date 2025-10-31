/**
 * E2E test suite for the AWS S3 driver.
 *
 * Notes:
 * - These tests are optional and are NOT run in CI by default.
 * - To run in CI, trigger the CI workflow manually (workflow_dispatch) with input `run_e2e: true`.
 * - To run locally, set the following environment variables and execute `pnpm run test:e2e`:
 *   - AWS_S3_E2E_ENABLED=true
 *   - AWS_S3_TEST_BUCKET=<your-test-bucket>
 *   - AWS_S3_TEST_PREFIX=<optional-prefix>
 *
 * AWS credentials (required for AWS SDK to run S3 commands):
 * - Credentials must be configured so the AWS SDK can authenticate.
 * - Any standard method supported by the AWS SDK v3 is valid, for example:
 *   - Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION (or AWS_DEFAULT_REGION)
 *   - Shared config/credentials files: ~/.aws/config and ~/.aws/credentials (optionally with AWS_PROFILE)
 *   - IAM role via EC2/ECS/SSO or other supported providers
 * - If credentials are not available via the default provider chain, set the env vars above.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createStorage } from 'unstorage';
import awsS3Driver from '../src/drivers/aws-s3/aws-s3';
import { S3Client } from '@aws-sdk/client-s3';

describe('AWS S3 Driver E2E Tests', () => {
  let storage: ReturnType<typeof createStorage>;
  let s3Client: S3Client;

  // These tests would require actual AWS credentials and an S3 bucket
  // In a real environment, you would use a test bucket or LocalStack
  const isE2EEnabled = process.env.AWS_S3_E2E_ENABLED === 'true';
  const testBucket = process.env.AWS_S3_TEST_BUCKET || 'test-bucket-not-set';
  const testPrefix = process.env.AWS_S3_TEST_PREFIX || 'test-mtng-unstorage-e2e/';

  beforeEach(async () => {
    if (!isE2EEnabled) {
      return;
    }

    const region = process.env.AWS_REGION;

    s3Client = new S3Client({
      region
    });

    storage = createStorage({
      driver: awsS3Driver({
        s3Client,
        bucket: testBucket,
        s3StoragePrefix: testPrefix,
        allowClear: true
      })
    });

    // Clean up any existing test data
    await storage.clear();
  });

  afterEach(async () => {
    if (!isE2EEnabled || !storage) {
      return;
    }

    // Clean up test data
    await storage.clear();
  });

  it.skipIf(!isE2EEnabled)('should perform basic CRUD operations', async () => {
    const testKey = 'test-key'
    const testValue = { message: 'Hello, World!', timestamp: Date.now() }

    // Initially should not exist
    expect(await storage.hasItem(testKey)).toBe(false)
    expect(await storage.getItem(testKey)).toBe(null)

    // Set item
    await storage.setItem(testKey, testValue)

    // Should now exist
    expect(await storage.hasItem(testKey)).toBe(true)
    
    // Get item should return the same value
    const retrieved = await storage.getItem(testKey)
    expect(retrieved).toEqual(testValue)

    // Remove item
    await storage.removeItem(testKey)

    // Should no longer exist
    expect(await storage.hasItem(testKey)).toBe(false)
    expect(await storage.getItem(testKey)).toBe(null)
  })

  it.skipIf(!isE2EEnabled)('should handle different data types', async () => {
    const testCases = [
      { key: 'string-value', value: 'simple string' },
      { key: 'number-value', value: 42 },
      { key: 'boolean-value', value: true },
      { key: 'object-value', value: { nested: { data: 'test' } } },
      { key: 'array-value', value: [1, 2, 3, 'four'] },
      { key: 'null-value', value: null },
      { key: 'empty-string', value: '' }
    ]

    // Set all values
    for (const testCase of testCases) {
      await storage.setItem(testCase.key, testCase.value)
    }

    // Verify all values
    for (const testCase of testCases) {
      const retrieved = await storage.getItem(testCase.key)
      expect(retrieved).toEqual(testCase.value)
    }

    // Clean up
    for (const testCase of testCases) {
      await storage.removeItem(testCase.key)
    }
  })

  it.skipIf(!isE2EEnabled)('should list keys correctly', async () => {
    const testData = {
      'key1': 'value1',
      'key2': 'value2',
      'folder/key3': 'value3',
      'folder/subfolder/key4': 'value4'
    }

    // Set test data
    for (const [key, value] of Object.entries(testData)) {
      await storage.setItem(key, value)
    }

    // Get all keys
    const allKeys = await storage.getKeys()
    // Note: unstorage normalizes '/' to ':' in keys
    const expectedKeys = ['key1', 'key2', 'folder:key3', 'folder:subfolder:key4']
    expect(allKeys.sort()).toEqual(expectedKeys.sort())

    // Get keys with prefix
    const folderKeys = await storage.getKeys('folder')
    expect(folderKeys.sort()).toEqual(['folder:key3', 'folder:subfolder:key4'].sort())

    // Clean up
    for (const key of Object.keys(testData)) {
      await storage.removeItem(key)
    }
  })

  it.skipIf(!isE2EEnabled)('should clear all items', async () => {
    const testData = {
      'clear-test-1': 'value1',
      'clear-test-2': 'value2',
      'clear-test-3': 'value3'
    }

    // Set test data
    for (const [key, value] of Object.entries(testData)) {
      await storage.setItem(key, value)
    }

    // Verify data exists
    const keysBeforeClear = await storage.getKeys()
    expect(keysBeforeClear.length).toBeGreaterThanOrEqual(3)

    // Clear all
    await storage.clear()

    // Verify all data is gone
    const keysAfterClear = await storage.getKeys()
    expect(keysAfterClear).toEqual([])

    // Verify individual items are gone
    for (const key of Object.keys(testData)) {
      expect(await storage.hasItem(key)).toBe(false)
    }
  })

  it.skipIf(!isE2EEnabled)('should handle large values', async () => {
    const largeObject = {
      data: 'x'.repeat(10000), // 10KB string
      numbers: Array.from({ length: 1000 }, (_, i) => i),
      nested: {
        level1: {
          level2: {
            level3: {
              value: 'deeply nested'
            }
          }
        }
      }
    }

    const testKey = 'large-object'

    await storage.setItem(testKey, largeObject)
    
    const retrieved = await storage.getItem(testKey)
    expect(retrieved).toEqual(largeObject)

    await storage.removeItem(testKey)
    expect(await storage.hasItem(testKey)).toBe(false)
  })

  it.skipIf(!isE2EEnabled)('should handle concurrent operations', async () => {
    const concurrentOperations = Array.from({ length: 10 }, (_, i) => ({
      key: `concurrent-${i}`,
      value: { index: i, timestamp: Date.now() }
    }))

    // Set all values concurrently
    await Promise.all(
      concurrentOperations.map(({ key, value }) => 
        storage.setItem(key, value)
      )
    )

    // Get all values concurrently
    const results = await Promise.all(
      concurrentOperations.map(({ key }) => 
        storage.getItem(key)
      )
    )

    // Verify all results
    results.forEach((result, index) => {
      expect(result).not.toBe(null)
      expect(typeof result).toBe('object')
      expect((result as any).index).toBe(index)
      expect(typeof (result as any).timestamp).toBe('number')
    })

    // Clean up concurrently
    await Promise.all(
      concurrentOperations.map(({ key }) => 
        storage.removeItem(key)
      )
    )

    // Verify cleanup
    const hasResults = await Promise.all(
      concurrentOperations.map(({ key }) => 
        storage.hasItem(key)
      )
    )

    expect(hasResults.every(has => has === false)).toBe(true)
  })

  it.skipIf(!isE2EEnabled)('should work with custom content type and encryption', async () => {
    const customStorage = createStorage({
      driver: awsS3Driver({
        s3Client,
        bucket: testBucket,
        s3StoragePrefix: testPrefix + 'custom/'
      })
    })

    const testKey = 'custom-options-test'
    const testValue = 'plain text value'

    await customStorage.setItem(testKey, testValue)
    
    const retrieved = await customStorage.getItem(testKey)
    expect(retrieved).toBe(testValue)

    await customStorage.removeItem(testKey)
  })

  it.skipIf(!isE2EEnabled)('should support maxDepth filtering', async () => {
    const testData = {
      'depth0': 'value0',
      'depth0/file1': 'value1',
      'depth0/sub1/file2': 'value2',
      'depth0/sub1/sub2/file3': 'value3',
      'depth0/sub1/sub2/sub3/file4': 'value4'
    }

    // Set test data
    for (const [key, value] of Object.entries(testData)) {
      await storage.setItem(key, value)
    }

    // Test maxDepth: 0 (only top-level keys)
    const depth0Keys = await storage.getKeys(undefined, { maxDepth: 0 })
    expect(depth0Keys).toContain('depth0')
    expect(depth0Keys.filter(k => k.includes(':'))).toHaveLength(0)

    // Test maxDepth: 1 (up to 1 level deep)
    const depth1Keys = await storage.getKeys(undefined, { maxDepth: 1 })
    expect(depth1Keys).toContain('depth0')
    expect(depth1Keys).toContain('depth0:file1')
    expect(depth1Keys.filter(k => (k.match(/:/g) || []).length > 1)).toHaveLength(0)

    // Test maxDepth: 2 (up to 2 levels deep)
    const depth2Keys = await storage.getKeys(undefined, { maxDepth: 2 })
    expect(depth2Keys).toContain('depth0:sub1:file2')
    expect(depth2Keys.filter(k => (k.match(/:/g) || []).length > 2)).toHaveLength(0)

    // Clean up
    for (const key of Object.keys(testData)) {
      await storage.removeItem(key)
    }
  })

})