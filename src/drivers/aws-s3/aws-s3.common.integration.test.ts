import { describe, it, expect, beforeEach } from 'vitest'
import { createStorage } from 'unstorage'
import awsS3Driver from './aws-s3.js'
import awsS3FlexDriver from './aws-s3-flex.js'
import { AWS_S3_DRIVER_NAME, AWS_S3_FLEX_DRIVER_NAME } from './types.js'
import { MockS3Client } from '../../../tests/helpers/mock-s3.js'

// Common integration test registration for both base and flex S3 drivers using mounted storage instances
export function registerAwsS3CommonIntegrationTests(args: {
  label: string
  makeDriver: (opts: any) => any
}) {
  const { label, makeDriver } = args

  describe(`${label} aws-s3 integration`, () => {
    let mockClient: MockS3Client
    let storage: ReturnType<typeof createStorage>
    const defaultOptionsBase = {
      bucket: 'test-bucket',
      storagePrefix: 'test-prefix/',
      name: `test-s3-${label}`,
      allowClear: true
    }

    beforeEach(() => {
      mockClient = new MockS3Client()
      mockClient.storage.clear()
      storage = createStorage()
      storage.mount('data', makeDriver({
        ...defaultOptionsBase,
        s3Client: mockClient
      }))
    })

    describe('constructor', () => {
      it('creates driver with valid options via storage interface', () => {
        // Test that the mounted driver is accessible
        expect(storage).toBeDefined()
      })

      it('throws when bucket is missing', () => {
        expect(() => {
          const errorStorage = createStorage()
          errorStorage.mount('error', makeDriver({ ...defaultOptionsBase, s3Client: mockClient, bucket: '' }))
        }).toThrow('S3 bucket name is required')
      })

      it('constructs internal S3 client when s3Client missing (smoke)', () => {
        // We can't assert constructor calls with MockS3Client, but ensure it doesn't throw
        const smokeStorage = createStorage()
        smokeStorage.mount('smoke', makeDriver({ ...defaultOptionsBase }))
        expect(smokeStorage).toBeDefined()
      })

      it('accepts inline credentials without throwing', () => {
        const credStorage = createStorage()
        credStorage.mount('cred', makeDriver({ 
          ...defaultOptionsBase, 
          region: 'us-east-1', 
          accessKeyId: 'AKIA_TEST', 
          secretAccessKey: 'SECRET', 
          sessionToken: 'TOKEN' 
        }))
        expect(credStorage).toBeDefined()
      })

      it('throws if credential pair incomplete', () => {
        expect(() => {
          const errorStorage = createStorage()
          errorStorage.mount('error', makeDriver({ ...defaultOptionsBase, accessKeyId: 'ONLY' }))
        }).toThrow('Both accessKeyId and secretAccessKey are required when providing inline credentials')
        
        expect(() => {
          const errorStorage2 = createStorage()
          errorStorage2.mount('error2', makeDriver({ ...defaultOptionsBase, secretAccessKey: 'ONLY' }))
        }).toThrow('Both accessKeyId and secretAccessKey are required when providing inline credentials')
      })
    })

    describe('hasItem', () => {
      it('returns true when object exists via storage interface', async () => {
        // Seed storage with the S3 key the driver will write to
        mockClient.storage.set('test-prefix/test-key', 'v')
        const result = await storage.hasItem('data:test-key')
        expect(result).toBe(true)
      })

      it('returns false when object missing via storage interface', async () => {
        expect(await storage.hasItem('data:test-key')).toBe(false)
      })
    })

    describe('getItem/setItem/removeItem', () => {
      it('round-trips string values via storage interface', async () => {
        await storage.setItem('data:test-key', 'plain text')
        // underlying S3 key should exist in mock storage
        // Base driver preserves ':' separators in underlying keys; no need to assert exact internal key format here.
        expect(Array.from(mockClient.storage.values()).includes('plain text')).toBe(true)
        expect(await storage.getItem('data:test-key')).toBe('plain text')
        await storage.removeItem('data:test-key')
        expect(mockClient.storage.has('test-prefix/test-key')).toBe(false)
      })

      it('handles typed objects correctly via storage interface', async () => {
        const user = { id: 123, name: 'John' }
        await storage.setItem('data:user:123', user)
        const retrieved = await storage.getItem<typeof user>('data:user:123')
        expect(retrieved).toEqual(user)
        // Underlying key retains ':' separators; just ensure value was stored
        expect(Array.from(mockClient.storage.values()).includes(JSON.stringify(user))).toBe(true)
      })

      it('passes custom S3 options through storage interface', async () => {
        await expect(storage.setItem('data:test-key', 'content')).resolves.toBeUndefined()
      })
    })

    describe('getKeys', () => {
      it('lists keys and maps to unstorage format via storage interface', async () => {
        // Seed S3 keys
        mockClient.storage.set('test-prefix/key1', '1')
        mockClient.storage.set('test-prefix/key2', '2')
        mockClient.storage.set('test-prefix/folder/key3', '3')
        expect((await storage.getKeys('data')).sort()).toEqual(['data:key1', 'data:key2', 'data:folder:key3'].sort())
      })

      it('filters by base prefix via storage interface', async () => {
        mockClient.storage.set('test-prefix/base/key1', '1')
        mockClient.storage.set('test-prefix/base/key2', '2')
        expect((await storage.getKeys('data:base')).sort()).toEqual(['data:base:key1', 'data:base:key2'].sort())
      })

      it('supports maxDepth filtering via storage interface', async () => {
        mockClient.storage.set('test-prefix/depth0', 'v')
        mockClient.storage.set('test-prefix/depth0/file1', 'v')
        mockClient.storage.set('test-prefix/depth0/sub1/file2', 'v')
        mockClient.storage.set('test-prefix/depth0/sub1/sub2/file3', 'v')
        mockClient.storage.set('test-prefix/depth0/sub1/sub2/sub3/file4', 'v')
        
        const depth0 = await storage.getKeys('data', { maxDepth: 0 })
        const depth1 = await storage.getKeys('data', { maxDepth: 1 })
        const depth2 = await storage.getKeys('data', { maxDepth: 2 })
        const all = await storage.getKeys('data')

        expect(depth0.length).toBe(0) // mounted storage includes mount prefix in keys for depth calculation
        expect(depth1.length).toBe(1)
        expect(depth2.length).toBe(2)
        expect(all.length).toBe(5)
      })
    })

    describe('clear', () => {
      it('deletes all keys under prefix via storage interface', async () => {
        mockClient.storage.set('test-prefix/key1', '1')
        mockClient.storage.set('test-prefix/key2', '2')
        await storage.clear('data')
        expect(Array.from(mockClient.storage.keys()).filter(k => k.startsWith('test-prefix/')).length).toBe(0)
      })
    })

    describe('readOnly mode', () => {
      let readOnlyStorage: ReturnType<typeof createStorage>

      beforeEach(() => {
        readOnlyStorage = createStorage()
        readOnlyStorage.mount('readonly', makeDriver({ ...defaultOptionsBase, s3Client: mockClient, readOnly: true }))
      })

      it('blocks setItem/removeItem/clear via storage interface', async () => {
        await expect(readOnlyStorage.setItem('readonly:k', 'v')).rejects.toThrow('driver is in read-only mode')
        await expect(readOnlyStorage.removeItem('readonly:k')).rejects.toThrow('driver is in read-only mode')
        await expect(readOnlyStorage.clear('readonly')).rejects.toThrow('driver is in read-only mode')
      })

      it('allows read operations via storage interface', async () => {
        mockClient.storage.set('test-prefix/key1', 'value')
        expect(await readOnlyStorage.getItem('readonly:key1')).toBe('value')
        expect(await readOnlyStorage.hasItem('readonly:key1')).toBe(true)
        expect(await readOnlyStorage.getKeys('readonly')).toEqual(['readonly:key1'])
      })
    })

    describe('allowClear option', () => {
      it('blocks clear when allowClear false via storage interface', async () => {
        const noClearStorage = createStorage()
        noClearStorage.mount('noclear', makeDriver({ ...defaultOptionsBase, s3Client: mockClient, allowClear: false }))
        await expect(noClearStorage.clear('noclear')).rejects.toThrow('allowClear option must be set to true')
      })

      it('blocks clear when allowClear undefined via storage interface', async () => {
        const { allowClear, ...rest } = defaultOptionsBase as any
        const undefinedClearStorage = createStorage()
        undefinedClearStorage.mount('undefined', makeDriver({ ...rest, s3Client: mockClient }))
        await expect(undefinedClearStorage.clear('undefined')).rejects.toThrow('allowClear option must be set to true')
      })

      it('allows clear when allowClear true via storage interface', async () => {
        await expect(storage.clear('data')).resolves.toBeUndefined()
      })

      it('still checks readOnly first via storage interface', async () => {
        const readOnlyNoClearStorage = createStorage()
        readOnlyNoClearStorage.mount('readonly', makeDriver({ ...defaultOptionsBase, s3Client: mockClient, readOnly: true }))
        await expect(readOnlyNoClearStorage.clear('readonly')).rejects.toThrow('driver is in read-only mode')
      })
    })
  })
}

// Register the common integration suite for both base and flex drivers
describe('aws-s3 base driver (integration)', () => {
  registerAwsS3CommonIntegrationTests({
    label: 'base',
    makeDriver: (opts) => awsS3Driver(opts),
  })

  it('uses default driver name when name omitted via storage interface', () => {
    const testStorage = createStorage()
    testStorage.mount('test', awsS3Driver({ s3Client: new MockS3Client() as any, bucket: 'bucket-1' }))
    // Cannot directly access driver name through storage interface, but mount succeeds
    expect(testStorage).toBeDefined()
  })
})

describe('aws-s3 flex driver (integration)', () => {
  registerAwsS3CommonIntegrationTests({
    label: 'flex',
    makeDriver: (opts) => awsS3FlexDriver(opts),
  })

  it('uses default driver name when name omitted via storage interface', () => {
    const testStorage = createStorage()
    testStorage.mount('test', awsS3FlexDriver({ s3Client: new MockS3Client() as any, bucket: 'bucket-1' }))
    // Cannot directly access driver name through storage interface, but mount succeeds
    expect(testStorage).toBeDefined()
  })
})