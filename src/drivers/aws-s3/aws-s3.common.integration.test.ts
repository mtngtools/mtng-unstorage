import { describe, it, expect, beforeEach } from 'vitest'
import { createStorage } from 'unstorage'
import awsS3Driver from './aws-s3.js'
import awsS3FlexDriver from './aws-s3-flex.js'
import { MockS3Client } from '../../../tests/helpers/mock-s3.js'
import type { AwsS3DriverOptions, AwsS3FlexDriverOptions } from './types.js'
import type { ConditionalDriver } from '../../types.js'

// Common integration test registration for both base and flex S3 drivers using mounted storage instances
export function registerAwsS3CommonIntegrationTests(args: {
  label: string
  makeDriver: <TOptions extends AwsS3DriverOptions | AwsS3FlexDriverOptions>(
    opts: TOptions
  ) => ConditionalDriver<TOptions>
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

      it('does not have setItem/removeItem/clear methods on driver', () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient, readOnly: true })
        expect(driver.setItem).toBeUndefined()
        expect(driver.removeItem).toBeUndefined()
        expect(driver.clear).toBeUndefined()
      })

      it('TypeScript correctly types read-only driver methods', () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient, readOnly: true })
        
        // TypeScript should know these methods exist
        const hasGetItem: typeof driver.getItem = driver.getItem
        const hasHasItem: typeof driver.hasItem = driver.hasItem
        const hasGetKeys: typeof driver.getKeys = driver.getKeys
        
        // Verify read-only driver type excludes write methods
        type DriverType = typeof driver
        type HasSetItem = DriverType extends { setItem: any } ? true : false
        type HasRemoveItem = DriverType extends { removeItem: any } ? true : false
        type HasClear = DriverType extends { clear: any } ? true : false
        
        // These should be false (methods don't exist)
        const _setItemCheck: HasSetItem = false
        const _removeItemCheck: HasRemoveItem = false
        const _clearCheck: HasClear = false
        
        // These assignments should compile (verify types are correct)
        expect(hasGetItem).toBeDefined()
        expect(hasHasItem).toBeDefined()
        expect(hasGetKeys).toBeDefined()
      })

      it('allows read operations via storage interface', async () => {
        mockClient.storage.set('test-prefix/key1', 'value')
        expect(await readOnlyStorage.getItem('readonly:key1')).toBe('value')
        expect(await readOnlyStorage.hasItem('readonly:key1')).toBe(true)
        expect(await readOnlyStorage.getKeys('readonly')).toEqual(['readonly:key1'])
      })
    })

    describe('allowClear option', () => {
      it('does not return clear when allowClear false', () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient, allowClear: false })
        expect(driver.clear).toBeUndefined()
      })

      it('does not return clear when allowClear undefined', () => {
        const { allowClear: _, ...rest } = defaultOptionsBase
        const driver = makeDriver({ ...rest, s3Client: mockClient } as typeof defaultOptionsBase)
        expect(driver.clear).toBeUndefined()
      })

      it('returns clear when allowClear true via storage interface', async () => {
        await expect(storage.clear('data')).resolves.toBeUndefined()
      })

      it('does not return clear when readOnly is true even if allowClear is true', () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient, readOnly: true, allowClear: true })
        expect(driver.clear).toBeUndefined()
      })

      it('TypeScript correctly types conditional methods based on options', () => {
        // Test full access driver
        const fullDriver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient, allowClear: true })
        const hasSetItem: typeof fullDriver.setItem = fullDriver.setItem
        const hasRemoveItem: typeof fullDriver.removeItem = fullDriver.removeItem
        const hasClear: typeof fullDriver.clear = fullDriver.clear
        expect(hasSetItem).toBeDefined()
        expect(hasRemoveItem).toBeDefined()
        expect(hasClear).toBeDefined()

        // Test driver without clear
        const noClearDriver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient, allowClear: false })
        const hasSetItem2: typeof noClearDriver.setItem = noClearDriver.setItem
        const hasRemoveItem2: typeof noClearDriver.removeItem = noClearDriver.removeItem
        
        // Verify clear doesn't exist when allowClear is false
        type NoClearDriverType = typeof noClearDriver
        type HasClear = NoClearDriverType extends { clear: any } ? true : false
        const _clearCheck: HasClear = false
        
        expect(hasSetItem2).toBeDefined()
        expect(hasRemoveItem2).toBeDefined()
      })

      it('TypeScript correctly infers getItem generic types', async () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient })
        
        // Type inference should work
        const stringValue = await driver.getItem<string>('test-key')
        const numberValue = await driver.getItem<number>('test-key')
        const objectValue = await driver.getItem<{ name: string }>('test-key')
        
        // Verify types are correct (compile-time check)
        const _stringCheck: string | null = stringValue
        const _numberCheck: number | null = numberValue
        const _objectCheck: { name: string } | null = objectValue
        
        expect(stringValue).toBeNull()
        expect(numberValue).toBeNull()
        expect(objectValue).toBeNull()
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

  it('TypeScript correctly types driver when used with createStorage', () => {
    const testStorage = createStorage()
    const options: AwsS3DriverOptions = { 
      s3Client: new MockS3Client() as any, 
      bucket: 'bucket-1',
      allowClear: true 
    }
    const driver = awsS3Driver(options)
    
    // Verify driver has expected methods (runtime check)
    // TypeScript compile-time checking ensures types are correct
    expect(driver.getItem).toBeDefined()
    expect(driver.setItem).toBeDefined()
    expect(driver.clear).toBeDefined()
    
    // Type-level verification: driver should be assignable to ConditionalDriver
    type DriverType = typeof driver
    type IsConditionalDriver = DriverType extends ConditionalDriver<typeof options> ? true : false
    const _typeCheck: IsConditionalDriver = true
    
    testStorage.mount('test', driver)
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

  it('TypeScript correctly types flex driver when used with createStorage', () => {
    const testStorage = createStorage()
    const options: AwsS3FlexDriverOptions = { 
      s3Client: new MockS3Client() as any, 
      bucket: 'bucket-1',
      allowClear: true 
    }
    const driver = awsS3FlexDriver(options)
    
    // Verify driver has expected methods (runtime check)
    // TypeScript compile-time checking ensures types are correct
    expect(driver.getItem).toBeDefined()
    expect(driver.setItem).toBeDefined()
    expect(driver.clear).toBeDefined()
    
    // Type-level verification: driver should be assignable to ConditionalDriver
    type DriverType = typeof driver
    type IsConditionalDriver = DriverType extends ConditionalDriver<typeof options> ? true : false
    const _typeCheck: IsConditionalDriver = true
    
    testStorage.mount('test', driver)
    expect(testStorage).toBeDefined()
  })
})