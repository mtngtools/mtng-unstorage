import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockS3Client } from '../../../tests/helpers/mock-s3.js'

import { createStorage } from 'unstorage'
import { mapS3ObjectKeyToUnstorageKey, mapUnstorageKeyToS3Key } from './shared.js'
import awsS3Driver from './aws-s3.js'
import awsS3FlexDriver from './aws-s3-flex.js'

// Mock implementation is provided by the shared helper import above

/**
 * Compare tests: ensure aws-s3-flex (with mapping) matches base aws-s3
 * from the consumer perspective. These tests focus on comparing base
 * functionality between the two drivers.
 */
describe('aws-s3 compare-to-flex mapping parity (unit)', () => {
  let mockClient: MockS3Client

  beforeEach(() => {
    mockClient = new MockS3Client()
  })

  it('behaves the same as aws-s3 when a to/from mapping is provided', async () => {
    const bucket = 'test-bucket'
    const prefix = 'prefix/'


    // Create two storages that should be equivalent to the consumer
    const baseStorage = createStorage({
      driver: awsS3Driver({
        s3Client: (mockClient as any),
        bucket,
        storagePrefix: 'test-storage-prefix',
        base: 'test-unstorage-prefix',
        name: 'aws-s3-base',
        allowClear: true
      })
    })

    // For flex, we provide the mapping but use the same underlying mock client
    const flexStorage = createStorage({
      driver: awsS3FlexDriver({
        s3Client: (mockClient as any),
        bucket,
        storagePrefix: 'test-storage-prefix',
        base: 'test-unstorage-prefix',
        name: 'aws-s3-flex',
        allowClear: true,
        toStorageKey: mapUnstorageKeyToS3Key,
        fromStorageKey: mapS3ObjectKeyToUnstorageKey  
      })
    })

  // Ensure a clean slate — clear any existing keys
  await baseStorage.clear();
  await flexStorage.clear();
  // Also clear the underlying mock client directly to be safe
  (mockClient as any).storage.clear()

    // Use consumer-visible keys (with ':' separators)
    const key = 'folder:sub:key'
    const value = { hello: 'world' }

    // Initially both storages should show no item
    expect(await baseStorage.hasItem(key)).toBe(false)
    expect(await flexStorage.hasItem(key)).toBe(false)

    // Set in base storage
    await baseStorage.setItem(key, value)
    // Get via flex storage should observe the same value (mapping applied)
    expect(await flexStorage.hasItem(key)).toBe(true)
    expect(await flexStorage.getItem(key)).toEqual(value)

    // Remove via flex storage
    await flexStorage.removeItem(key)
    expect(await baseStorage.hasItem(key)).toBe(false)

    // Test getKeys parity: add multiple keys via baseStorage
    const items = {
      'k1': 'v1',
      'folder:k2': 'v2',
      'folder:sub:k3': 'v3'
    }

    for (const [k, v] of Object.entries(items)) {
      await baseStorage.setItem(k, v)
    }

    const baseKeys = (await baseStorage.getKeys()).sort()
    const flexKeys = (await flexStorage.getKeys()).sort()

    expect(flexKeys).toEqual(baseKeys)

    // Cleanup
    for (const k of baseKeys) {
      await baseStorage.removeItem(k)
    }
  })
})
