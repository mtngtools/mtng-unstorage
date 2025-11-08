import { describe, it, expect, beforeEach } from 'vitest'
import { createStorage } from 'unstorage'
import awsS3FlexDriver from './aws-s3-flex.js'
import { MockS3Client } from '../../../tests/helpers/mock-s3.js'
import { mapS3ObjectKeyToUnstorageKey, mapUnstorageKeyToS3Key, toS3KeyWithJSONExt } from './shared.js'
import type { AwsS3FlexDriverOptions } from './types.js'
import type { ConditionalDriver } from '../../types.js'

describe('aws-s3-flex driver integration', () => {
  let mockClient: MockS3Client
  let storage: ReturnType<typeof createStorage>

  beforeEach(() => {
    mockClient = new MockS3Client()
    storage = createStorage()
  })

  describe('custom key mapping via storage interface', () => {
    beforeEach(() => {
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
      expect(mockClient.storage.has('session-user:123:profile.json')).toBe(true)
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
    beforeEach(() => {
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
        // Dates are serialized by Storage layer; compare using ISO string
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

  describe('mapping behavior when mounted at specific paths', () => {
    it('isolates mapping behavior between different mount points', async () => {
      // Mount two flex drivers with different mappings
      storage.mount('json', awsS3FlexDriver({
        s3Client: mockClient as any,
        bucket: 'test-bucket',
        storagePrefix: 'json-data/',
        allowClear: true,
  toStorageKey: (key, driverOpts, opts) => toS3KeyWithJSONExt(key, driverOpts, opts),
  fromStorageKey: (s3Key, driverOpts, opts) => mapS3ObjectKeyToUnstorageKey(s3Key, driverOpts, opts).replace(/\.json$/, ''),
      }))

      storage.mount('xml', awsS3FlexDriver({
        s3Client: mockClient as any,
        bucket: 'test-bucket',
        storagePrefix: 'xml-data/',
        allowClear: true,
  toStorageKey: (key, driverOpts, opts) => `${mapUnstorageKeyToS3Key(key, driverOpts, opts)}.xml`,
  fromStorageKey: (s3Key, driverOpts, opts) => mapS3ObjectKeyToUnstorageKey(s3Key, driverOpts, opts).replace(/\.xml$/, ''),
      }))

      const testData = { format: 'test' }
      
      await storage.setItem('json:document', testData)
      await storage.setItem('xml:document', testData)
      
  // Verify different transformations were applied
  expect(mockClient.storage.has('json-data/document.json')).toBe(true)
      expect(mockClient.storage.has('xml-data/document.xml')).toBe(true)
      
      // Verify retrieval works for both
      expect(await storage.getItem('json:document')).toEqual(testData)
      expect(await storage.getItem('xml:document')).toEqual(testData)
      
      // Verify isolation - each mount only sees its own keys
  const jsonKeys = await storage.getKeys('json')
      const xmlKeys = await storage.getKeys('xml')
      
      expect(jsonKeys).toEqual(['json:document'])
      expect(xmlKeys).toEqual(['xml:document'])
    })
  })

  describe('error handling with invalid mapping functions', () => {
    it('handles errors in toStorageKey mapping', async () => {
      storage.mount('error', awsS3FlexDriver({
        s3Client: mockClient as any,
        bucket: 'test-bucket',
        allowClear: true,
        toStorageKey: () => { throw new Error('Key mapping failed') },
        fromStorageKey: (s3Key) => s3Key,
      }))

      await expect(storage.setItem('error:key', 'value')).rejects.toThrow('Key mapping failed')
    })

    it('handles errors in fromStorageKey mapping', async () => {
      storage.mount('error', awsS3FlexDriver({
        s3Client: mockClient as any,
        bucket: 'test-bucket',
        allowClear: true,
        toStorageKey: (key) => key,
        fromStorageKey: () => { throw new Error('Key unmapping failed') },
      }))

      // Set data directly in mock storage to test fromStorageKey error
      mockClient.storage.set('direct-key', 'value')
      
      await expect(storage.getKeys('error')).rejects.toThrow('Key unmapping failed')
    })

    it('handles errors in toStorageValue mapping', async () => {
      storage.mount('error', awsS3FlexDriver({
        s3Client: mockClient as any,
        bucket: 'test-bucket',
        allowClear: true,
        toStorageValue: () => { throw new Error('Value mapping failed') },
        fromStorageValue: (value) => JSON.parse(value),
      }))

      await expect(storage.setItem('error:key', 'value')).rejects.toThrow('Value mapping failed')
    })

    it('handles errors in fromStorageValue mapping', async () => {
      storage.mount('error', awsS3FlexDriver({
        s3Client: mockClient as any,
        bucket: 'test-bucket',
        allowClear: true,
        toStorageValue: (value) => JSON.stringify(value),
        fromStorageValue: () => { throw new Error('Value unmapping failed') },
      }))

      // Set data and try to retrieve it; driver returns null on mapping errors
      await storage.setItem('error:key', 'value')
      await expect(storage.getItem('error:key')).resolves.toBeNull()
    })
  })

  describe('TypeScript type checking', () => {
    it('correctly types flex driver with value mapping', () => {
      const options: AwsS3FlexDriverOptions = {
        s3Client: mockClient as any,
        bucket: 'test-bucket',
        allowClear: true,
        toStorageValue: (v) => JSON.stringify(v),
        fromStorageValue: (v: string) => JSON.parse(v),
      }
      const driver = awsS3FlexDriver(options)
      
      // Verify driver has expected methods (runtime check)
      expect(driver.getItem).toBeDefined()
      expect(driver.setItem).toBeDefined()
      expect(driver.clear).toBeDefined()
      
      // Type-level verification: driver should be assignable to ConditionalDriver
      type DriverType = typeof driver
      type IsConditionalDriver = DriverType extends ConditionalDriver<typeof options> ? true : false
      const _typeCheck: IsConditionalDriver = true
    })

    it('correctly infers return types from fromStorageValue', async () => {
      const driver = awsS3FlexDriver({
        s3Client: mockClient as any,
        bucket: 'test-bucket',
        allowClear: true,
        fromStorageValue: (v: string) => JSON.parse(v),
      })
      
      // Type inference should work with generic
      const userValue = await driver.getItem<{ name: string }>('test-key')
      // TypeScript should correctly infer the return type
      const _userCheck: { name: string } | null = userValue
      
      expect(userValue).toBeNull()
    })

    it('correctly types read-only flex driver', () => {
      const options: AwsS3FlexDriverOptions = {
        s3Client: mockClient as any,
        bucket: 'test-bucket',
        readOnly: true,
        fromStorageValue: (v: string) => JSON.parse(v),
      }
      const driver = awsS3FlexDriver(options)
      
      // Runtime check: read-only driver should not have write methods
      expect(driver.setItem).toBeUndefined()
      expect(driver.removeItem).toBeUndefined()
      expect(driver.clear).toBeUndefined()
      expect(driver.getItem).toBeDefined()
      
      // Type-level verification: driver should exclude write methods
      type DriverType = typeof driver
      type HasSetItem = DriverType extends { setItem: any } ? true : false
      type HasRemoveItem = DriverType extends { removeItem: any } ? true : false
      type HasClear = DriverType extends { clear: any } ? true : false
      
      // These should be false (methods don't exist)
      const _setItemCheck: HasSetItem = false
      const _removeItemCheck: HasRemoveItem = false
      const _clearCheck: HasClear = false
    })
  })


})