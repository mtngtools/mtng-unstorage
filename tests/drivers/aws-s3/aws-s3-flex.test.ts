/**
 * AWS S3 Flex Driver MT Tests
 * 
 * Driver-specific MT tests for aws-s3 flex driver.
 * These tests are shared between integration and e2e test runs.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createStorage } from 'unstorage'
import { flexMtTests } from '../../variants/flex/flex-mt-tests.js'
import awsS3FlexDriver from '../../../src/drivers/aws-s3/aws-s3-flex.js'
import { MockS3Client } from '../../helpers/mock-s3.js'
import { mapS3ObjectKeyToUnstorageKey, toS3KeyWithJSONExt } from '../../../src/drivers/aws-s3/shared.js'
import type { AwsS3FlexDriverOptions } from '../../../src/drivers/aws-s3/types.js'

describe('aws-s3 flex (mt tests)', () => {
  const makeMockClient = () => new MockS3Client()
  const defaultOptions: AwsS3FlexDriverOptions = {
    bucket: 'test-bucket',
    storagePrefix: 'test-prefix/',
    name: 'test-s3-flex',
    allowClear: true,
    s3Client: makeMockClient() as any
  }

  const makeDriver = (opts: Partial<AwsS3FlexDriverOptions> = {}) => {
    // @ts-expect-error - Spreading Partial options with discriminated union credentials causes type error
    // The driver handles credential validation at runtime, so this is safe
    return awsS3FlexDriver({ ...defaultOptions, ...opts, s3Client: opts.s3Client || makeMockClient() as any })
  }

  // Shared flex variant MT tests
  flexMtTests({
    makeDriver,
    makeMockClient,
    defaultOptions
  })

  // S3-specific additional tests
  describe('S3-specific', () => {
    it('uses default driver name when name omitted via storage interface', () => {
      const testStorage = createStorage()
      testStorage.mount('test', awsS3FlexDriver({ s3Client: makeMockClient() as any, bucket: 'bucket-1' }))
      // Cannot directly access driver name through storage interface, but mount succeeds
      expect(testStorage).toBeDefined()
    })

    describe('custom key mapping via storage interface', () => {
      let mockClient: MockS3Client
      let storage: ReturnType<typeof createStorage>

      beforeEach(() => {
        mockClient = new MockS3Client()
        storage = createStorage()
        storage.mount('sessions', awsS3FlexDriver({
          s3Client: mockClient as any,
          bucket: 'test-bucket',
          allowClear: true,
          toStorageKey: (key, driverOpts, opts) => toS3KeyWithJSONExt(`session-${key}`, driverOpts, opts),
          fromStorageKey: (s3Key, driverOpts, opts) => mapS3ObjectKeyToUnstorageKey(s3Key, driverOpts, opts)
            .replace(/^session-/, '')
            .replace(/\.json$/, ''),
        }))
      })

      it('applies custom key mapping through storage interface', async () => {
        await storage.setItem('sessions:abc123', { token: 'xyz' })
        
        // Verify custom mapping was applied to S3 key
        expect(mockClient.storage.has('session-abc123.json')).toBe(true)
        expect(await storage.getItem('sessions:abc123')).toEqual({ token: 'xyz' })
      })

      it('lists keys with custom mapping through storage interface', async () => {
        mockClient.storage.set('session-key1.json', JSON.stringify({ data: '1' }))
        mockClient.storage.set('session-key2.json', JSON.stringify({ data: '2' }))
        
        const keys = await storage.getKeys('sessions')
        expect(keys.sort()).toEqual(['sessions:key1', 'sessions:key2'])
      })

      it('handles complex key structures with custom mapping', async () => {
        const complexData = { user: { id: 123, name: 'John' }, session: { active: true } }
        
        await storage.setItem('sessions:user:123:profile', complexData)
        
        // Verify the custom key transformation
        // Custom mapping converts 'sessions:' prefix to 'session-' and appends '.json'
        // With our fix, colons in the key are converted to slashes
        // So 'sessions:user:123:profile' -> 'session-user/123/profile.json'
        expect(mockClient.storage.has('session-user/123/profile.json')).toBe(true)
        expect(await storage.getItem('sessions:user:123:profile')).toEqual(complexData)
      })

      it('supports hasItem with custom key mapping', async () => {
        await storage.setItem('sessions:test-key', { exists: true })
        
        expect(await storage.hasItem('sessions:test-key')).toBe(true)
        expect(await storage.hasItem('sessions:non-existent')).toBe(false)
        
        // Verify underlying storage structure
        expect(mockClient.storage.has('session-test-key.json')).toBe(true)
        expect(mockClient.storage.has('session-non-existent.json')).toBe(false)
      })

      it('supports removeItem with custom key mapping', async () => {
        await storage.setItem('sessions:to-delete', { temporary: true })
        expect(await storage.hasItem('sessions:to-delete')).toBe(true)
        
        await storage.removeItem('sessions:to-delete')
        expect(await storage.hasItem('sessions:to-delete')).toBe(false)
        expect(mockClient.storage.has('session-to-delete.json')).toBe(false)
      })
    })

    describe('custom value mapping via storage interface', () => {
      let mockClient: MockS3Client
      let storage: ReturnType<typeof createStorage>

      beforeEach(() => {
        mockClient = new MockS3Client()
        storage = createStorage()
        storage.mount('data', awsS3FlexDriver({
          s3Client: mockClient as any,
          bucket: 'test-bucket',
          allowClear: true,
          // Map one JS object shape to another before persisting.
          // NOTE: the storage layer serializes non-string values to JSON first,
          // so `value` arrives here as a JSON string. We remap the object shape,
          // then return a JSON string for persistence. On read, we reverse it
          // and return a JSON string of the original shape so unstorage can
          // deserialize it back to a JS object.
          toStorageValue: (value) => {
            const original = JSON.parse(String(value))
            const mapped = { _type: 'mapped', payload: original }
            return JSON.stringify(mapped)
          },
          fromStorageValue: ((s3Value: string) => {
            const mapped = JSON.parse(s3Value)
            return JSON.stringify(mapped.payload)
          }) as any,
        }))
      })

      it('applies custom value mapping through storage interface', async () => {
        const testData = { id: 123, name: 'test' }
        await storage.setItem('data:test', testData)
        
        // Verify custom value serialization
        expect(mockClient.storage.get('test')).toBe(JSON.stringify({ _type: 'mapped', payload: testData }))
        expect(await storage.getItem('data:test')).toEqual(testData)
      })

      it('handles complex nested objects with custom mapping', async () => {
        const complexData = {
          user: { id: 123, profile: { name: 'John', settings: { theme: 'dark' } } },
          metadata: { created: '2023-01-01T00:00:00.000Z', tags: ['admin', 'user'] }
        }
        
        await storage.setItem('data:complex', complexData)
        
        const retrieved = await storage.getItem('data:complex')
        expect(retrieved).toEqual(complexData)
        
        // Verify custom serialization format
        const stored = mockClient.storage.get('complex')
        expect(stored).toContain('"_type":"mapped"')
        expect(stored).toContain('"name":"John"')
      })
    })
  })
})

