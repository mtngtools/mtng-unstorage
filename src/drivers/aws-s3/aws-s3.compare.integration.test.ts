import { describe, it, expect, beforeEach } from 'vitest'
import { createStorage } from 'unstorage'
import awsS3Driver from './aws-s3.js'
import awsS3FlexDriver from './aws-s3-flex.js'
import { mapS3ObjectKeyToUnstorageKey, mapUnstorageKeyToS3Key, joinS3Key } from './shared.js'
import { MockS3Client } from '../../../tests/helpers/mock-s3.js'
import type { AwsS3DriverOptions, AwsS3FlexDriverOptions } from './types.js'
import type { ConditionalDriver } from '../../types.js'

describe('aws-s3 driver comparison via storage.mount()', () => {
  let mockClient1: MockS3Client
  let mockClient2: MockS3Client
  let storage: ReturnType<typeof createStorage>

  beforeEach(() => {
    mockClient1 = new MockS3Client()
    mockClient2 = new MockS3Client()
    storage = createStorage()
  })

  describe('multiple mount points with different drivers', () => {
    beforeEach(() => {
      // Mount base S3 driver for user data
      storage.mount('users', awsS3Driver({
        s3Client: mockClient1 as any,
        bucket: 'user-bucket',
        storagePrefix: 'app-users/',
        allowClear: true
      }))

      // Mount flex driver for session data with custom mapping
      storage.mount('sessions', awsS3FlexDriver({
        s3Client: mockClient2 as any,
        bucket: 'session-bucket',
        storagePrefix: 'app-sessions/',
        allowClear: true,
        // Include fullBasePrefix when mapping to S3 keys so listing under prefix finds the objects
        toStorageKey: (key: string, opts: any) => joinS3Key(opts.fullBasePrefix, `session-${key}.json`),
        fromStorageKey: (s3Key: string, opts: any) => mapS3ObjectKeyToUnstorageKey(s3Key, opts).replace(/^session-/, '').replace(/\.json$/, '')
      }))
    })

    it('isolates data between mounted drivers', async () => {
      await storage.setItem('users:123', { name: 'John' })
      await storage.setItem('sessions:abc', { token: 'xyz', expires: Date.now() })
      
      expect(await storage.getItem('users:123')).toEqual({ name: 'John' })
      expect(await storage.getItem('sessions:abc')).toEqual({ token: 'xyz', expires: expect.any(Number) })
      
      // Verify underlying storage isolation and mapping
      expect(mockClient1.storage.has('app-users/123')).toBe(true)
      expect(mockClient2.storage.has('app-sessions/session-abc.json')).toBe(true)
      expect(mockClient1.storage.has('app-sessions/session-abc.json')).toBe(false)
      expect(mockClient2.storage.has('app-users/123')).toBe(false)
    })

    it('compares behavior between base and flex drivers', async () => {
      // Test that both drivers handle the same data correctly but with different storage patterns
      const testData = { id: 1, value: 'test' }
      
      await storage.setItem('users:test', testData)
      await storage.setItem('sessions:test', testData)
      
      expect(await storage.getItem('users:test')).toEqual(testData)
      expect(await storage.getItem('sessions:test')).toEqual(testData)
      
      // Verify different underlying storage patterns
      expect(mockClient1.storage.get('app-users/test')).toBe(JSON.stringify(testData))
  expect(mockClient2.storage.get('app-sessions/session-test.json')).toBe(JSON.stringify(testData))
    })

    it('handles different key structures across mounts', async () => {
      const userData = { userId: 123, role: 'admin' }
      const sessionData = { sessionId: 'abc123', expires: Date.now() + 3600000 }
      
      // Test nested keys
      await storage.setItem('users:profile:123', userData)
      await storage.setItem('sessions:active:abc123', sessionData)
      
      // Verify retrieval
      expect(await storage.getItem('users:profile:123')).toEqual(userData)
      expect(await storage.getItem('sessions:active:abc123')).toEqual(sessionData)
      
      // Verify key listing across mounts
  const userKeys = await storage.getKeys('users')
  const sessionKeys = await storage.getKeys('sessions')
      
      expect(userKeys).toEqual(['users:profile:123'])
      expect(sessionKeys).toEqual(['sessions:active:abc123'])
      
      // Verify underlying key transformation
  // Base driver preserves ':' in underlying keys
  expect(mockClient1.storage.has('app-users/profile:123')).toBe(true)
  expect(mockClient2.storage.has('app-sessions/session-active:abc123.json')).toBe(true)
    })

    it('supports cross-mount operations', async () => {
      // Set data in both mounts
      await storage.setItem('users:shared', { data: 'user-data' })
      await storage.setItem('sessions:shared', { data: 'session-data' })
      
      // Get all keys across all mounts
  const allKeys = await storage.getKeys()
  // Order not guaranteed across mounts; ensure both present
  expect(allKeys).toEqual(expect.arrayContaining(['users:shared', 'sessions:shared']))
      
      // Clear individual mounts
      await storage.clear('users')
      expect(await storage.hasItem('users:shared')).toBe(false)
      expect(await storage.hasItem('sessions:shared')).toBe(true)
      
      await storage.clear('sessions')
      expect(await storage.hasItem('sessions:shared')).toBe(false)
    })
  })

  describe('mount path precedence and conflicts', () => {
    it('handles overlapping mount paths correctly', async () => {
      storage.mount('data', awsS3Driver({
        s3Client: mockClient1 as any,
        bucket: 'general-bucket',
        allowClear: true
      }))
      
      storage.mount('data:special', awsS3FlexDriver({
        s3Client: mockClient2 as any,
        bucket: 'special-bucket',
        allowClear: true
      }))

      await storage.setItem('data:normal', 'normal-value')
      await storage.setItem('data:special:item', 'special-value')

      // Verify the more specific mount takes precedence
      expect(mockClient1.storage.has('normal')).toBe(true)
      expect(mockClient2.storage.has('item')).toBe(true)
      expect(mockClient1.storage.has('special:item')).toBe(false)
    })

    it('handles same driver type with different configurations', async () => {
      storage.mount('bucket1', awsS3Driver({
        s3Client: mockClient1 as any,
        bucket: 'bucket-1',
        storagePrefix: 'prefix1/',
        allowClear: true
      }))
      
      storage.mount('bucket2', awsS3Driver({
        s3Client: mockClient2 as any,
        bucket: 'bucket-2',
        storagePrefix: 'prefix2/',
        allowClear: true
      }))

      const testData = { message: 'test-data' }
      await storage.setItem('bucket1:key', testData)
      await storage.setItem('bucket2:key', testData)

      // Verify data is stored in different mock clients
      expect(mockClient1.storage.get('prefix1/key')).toBe(JSON.stringify(testData))
      expect(mockClient2.storage.get('prefix2/key')).toBe(JSON.stringify(testData))
      expect(mockClient1.storage.has('prefix2/key')).toBe(false)
      expect(mockClient2.storage.has('prefix1/key')).toBe(false)
    })
  })

  describe('driver parity testing with unified storage', () => {
    it('maintains parity between base and flex drivers when mounted', async () => {
      const sharedClient = new MockS3Client()
      
      // Mount both drivers to same underlying storage for comparison
      storage.mount('base', awsS3Driver({
        s3Client: sharedClient as any,
        bucket: 'test-bucket',
        storagePrefix: 'test-storage-prefix/',
        base: 'test-unstorage-prefix',
        allowClear: true
      }))

      storage.mount('flex', awsS3FlexDriver({
        s3Client: sharedClient as any,
        bucket: 'test-bucket',
        storagePrefix: 'test-storage-prefix/',
        base: 'test-unstorage-prefix',
        allowClear: true,
        toStorageKey: mapUnstorageKeyToS3Key,
        fromStorageKey: mapS3ObjectKeyToUnstorageKey
      }))

      // Clear to ensure clean state
      await storage.clear('base')
      sharedClient.storage.clear()

      // Use consumer-visible keys (with ':' separators)
      const key = 'folder:sub:key'
      const value = { hello: 'world' }

      // Initially both mounts should show no item
      expect(await storage.hasItem(`base:${key}`)).toBe(false)
      expect(await storage.hasItem(`flex:${key}`)).toBe(false)

      // Set in base mount
      await storage.setItem(`base:${key}`, value)
      
      // Get via flex mount should observe the same value (mapping applied)
      expect(await storage.hasItem(`flex:${key}`)).toBe(true)
      expect(await storage.getItem(`flex:${key}`)).toEqual(value)

      // Remove via flex mount
      await storage.removeItem(`flex:${key}`)
      expect(await storage.hasItem(`base:${key}`)).toBe(false)

      // Test getKeys parity: add multiple keys via base mount
      const items = {
        'k1': 'v1',
        'folder:k2': 'v2',
        'folder:sub:k3': 'v3'
      }

      for (const [k, v] of Object.entries(items)) {
        await storage.setItem(`base:${k}`, v)
      }

      const baseKeys = (await storage.getKeys('base')).sort()
      const flexKeys = (await storage.getKeys('flex')).sort()

      // Convert keys to remove mount prefix for comparison
      const baseKeysStripped = baseKeys.map(k => k.replace('base:', '')).sort()
      const flexKeysStripped = flexKeys.map(k => k.replace('flex:', '')).sort()

      expect(flexKeysStripped).toEqual(baseKeysStripped)

        // Cleanup via base mount
        for (const k of baseKeysStripped) {
          await storage.removeItem(`base:${k}`)
        }
      })
    })

  describe('TypeScript type checking across multiple mounts', () => {
    it('correctly types drivers when mounted together', () => {
      const baseOptions: AwsS3DriverOptions = {
        s3Client: mockClient1 as any,
        bucket: 'user-bucket',
        storagePrefix: 'app-users/',
        allowClear: true
      }
      const flexOptions: AwsS3FlexDriverOptions = {
        s3Client: mockClient2 as any,
        bucket: 'session-bucket',
        storagePrefix: 'app-sessions/',
        allowClear: true,
        toStorageKey: (key: string, opts) => joinS3Key(opts.fullBasePrefix, `session-${key}.json`),
        fromStorageKey: (s3Key: string, opts) => mapS3ObjectKeyToUnstorageKey(s3Key, opts).replace(/^session-/, '').replace(/\.json$/, '')
      }

      const baseDriver = awsS3Driver(baseOptions)
      const flexDriver = awsS3FlexDriver(flexOptions)

      // Runtime check: both should have all methods (allowClear: true)
      expect(baseDriver.clear).toBeDefined()
      expect(flexDriver.clear).toBeDefined()

      // Type-level verification: drivers should be assignable to ConditionalDriver
      type BaseDriverType = typeof baseDriver
      type FlexDriverType = typeof flexDriver
      type BaseIsConditional = BaseDriverType extends ConditionalDriver<typeof baseOptions> ? true : false
      type FlexIsConditional = FlexDriverType extends ConditionalDriver<typeof flexOptions> ? true : false
      const _baseTypeCheck: BaseIsConditional = true
      const _flexTypeCheck: FlexIsConditional = true

      // Mount both
      const testStorage = createStorage()
      testStorage.mount('users', baseDriver)
      testStorage.mount('sessions', flexDriver)
      expect(testStorage).toBeDefined()
    })
  })

})