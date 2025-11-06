import { describe, it, expect, beforeEach } from 'vitest'
import awsS3Driver from './aws-s3.js'
import awsS3FlexDriver from './aws-s3-flex.js'
import { AWS_S3_DRIVER_NAME, AWS_S3_FLEX_DRIVER_NAME } from './types.js'
import { MockS3Client } from '../../../tests/helpers/mock-s3.js'

// Common test registration for both base and flex S3 drivers using MockS3Client
export function registerAwsS3CommonTests(args: {
  label: string
  makeDriver: (opts: any) => any
}) {
  const { label, makeDriver } = args

  describe(`${label} aws-s3 common`, () => {
    let mockClient: MockS3Client
    const defaultOptionsBase = {
      bucket: 'test-bucket',
      storagePrefix: 'test-prefix/',
      name: `test-s3-${label}`,
      allowClear: true
    }

    beforeEach(() => {
      mockClient = new MockS3Client()
      mockClient.storage.clear()
    })

    describe('constructor', () => {
      it('creates driver with valid options', () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient })
        expect(driver.name).toBe(`test-s3-${label}`)
      })

      it('throws when bucket is missing', () => {
        expect(() => makeDriver({ ...defaultOptionsBase, s3Client: mockClient, bucket: '' })).toThrow('S3 bucket name is required')
      })

      it('constructs internal S3 client when s3Client missing (smoke)', () => {
        // We can't assert constructor calls with MockS3Client, but ensure it doesn't throw
        const driver = makeDriver({ ...defaultOptionsBase })
        expect(driver.name).toBe(`test-s3-${label}`)
      })

      it('accepts inline credentials without throwing', () => {
        const driver = makeDriver({ ...defaultOptionsBase, region: 'us-east-1', accessKeyId: 'AKIA_TEST', secretAccessKey: 'SECRET', sessionToken: 'TOKEN' })
        expect(driver.name).toBe(`test-s3-${label}`)
      })

      it('throws if credential pair incomplete', () => {
        expect(() => makeDriver({ ...defaultOptionsBase, accessKeyId: 'ONLY' })).toThrow('Both accessKeyId and secretAccessKey are required when providing inline credentials')
        expect(() => makeDriver({ ...defaultOptionsBase, secretAccessKey: 'ONLY' })).toThrow('Both accessKeyId and secretAccessKey are required when providing inline credentials')
      })
    })

    describe('hasItem', () => {
      it('returns true when object exists', async () => {
        // Seed storage with the S3 key the driver will write to
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient })
        mockClient.storage.set('test-prefix/test-key', 'v')
        const result = await driver.hasItem('test-key', {})
        expect(result).toBe(true)
      })

      it('returns false when object missing', async () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient })
        expect(await driver.hasItem('test-key', {})).toBe(false)
      })
    })

    describe('getItem/setItem/removeItem', () => {
      it('round-trips string values', async () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient })
        await driver.setItem('test-key', 'plain text', {})
        // underlying S3 key should exist in mock storage
        expect(mockClient.storage.get('test-prefix/test-key')).toBe('plain text')
        expect(await driver.getItem('test-key')).toBe('plain text')
        await driver.removeItem('test-key', {})
        expect(mockClient.storage.has('test-prefix/test-key')).toBe(false)
      })

      it('passes custom S3 options (no-op in mock, but should not throw)', async () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient })
        await expect(driver.setItem('test-key', 'content', { s3Options: { ContentType: 'text/plain', Metadata: { a: 'b' } } })).resolves.toBeUndefined()
      })
    })

    describe('getKeys', () => {
      it('lists keys and maps to unstorage format', async () => {
        // Seed S3 keys
        mockClient.storage.set('test-prefix/key1', '1')
        mockClient.storage.set('test-prefix/key2', '2')
        mockClient.storage.set('test-prefix/folder/key3', '3')
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient })
        expect((await driver.getKeys('', {})).sort()).toEqual(['key1', 'key2', 'folder:key3'].sort())
      })

      it('filters by base prefix', async () => {
        mockClient.storage.set('test-prefix/base/key1', '1')
        mockClient.storage.set('test-prefix/base/key2', '2')
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient })
        expect((await driver.getKeys('base', {})).sort()).toEqual(['base:key1', 'base:key2'].sort())
      })

      it('supports maxDepth filtering', async () => {
        mockClient.storage.set('test-prefix/depth0', 'v')
        mockClient.storage.set('test-prefix/depth0/file1', 'v')
        mockClient.storage.set('test-prefix/depth0/sub1/file2', 'v')
        mockClient.storage.set('test-prefix/depth0/sub1/sub2/file3', 'v')
        mockClient.storage.set('test-prefix/depth0/sub1/sub2/sub3/file4', 'v')
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient })
        expect((await driver.getKeys('', { maxDepth: 0 })).sort()).toEqual(['depth0'])
        expect((await driver.getKeys('', { maxDepth: 1 })).sort()).toEqual(['depth0', 'depth0:file1'].sort())
        expect((await driver.getKeys('', { maxDepth: 2 })).sort()).toEqual(['depth0', 'depth0:file1', 'depth0:sub1:file2'].sort())
        expect((await driver.getKeys('', {})).sort()).toEqual(['depth0', 'depth0:file1', 'depth0:sub1:file2', 'depth0:sub1:sub2:file3', 'depth0:sub1:sub2:sub3:file4'].sort())
      })
    })

    describe('clear', () => {
      it('deletes all keys under prefix', async () => {
        mockClient.storage.set('test-prefix/key1', '1')
        mockClient.storage.set('test-prefix/key2', '2')
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient })
        await driver.clear('', {})
        expect(Array.from(mockClient.storage.keys()).filter(k => k.startsWith('test-prefix/')).length).toBe(0)
      })
    })

    describe('readOnly mode', () => {
      it('blocks setItem/removeItem/clear', async () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient, readOnly: true })
        await expect(driver.setItem('k', 'v', {})).rejects.toThrow('driver is in read-only mode')
        await expect(driver.removeItem('k', {})).rejects.toThrow('driver is in read-only mode')
        await expect(driver.clear('', {})).rejects.toThrow('driver is in read-only mode')
      })

      it('allows read operations', async () => {
        mockClient.storage.set('test-prefix/key1', 'value')
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient, readOnly: true })
        expect(await driver.getItem('key1', {})).toBe('value')
        expect(await driver.hasItem('key1', {})).toBe(true)
        expect(await driver.getKeys('', {})).toEqual(['key1'])
      })
    })

    describe('allowClear option', () => {
      it('blocks clear when allowClear false', async () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient, allowClear: false })
        await expect(driver.clear('', {})).rejects.toThrow('allowClear option must be set to true')
      })
      it('blocks clear when allowClear undefined', async () => {
        const { allowClear, ...rest } = defaultOptionsBase as any
        const driver = makeDriver({ ...rest, s3Client: mockClient })
        await expect(driver.clear('', {})).rejects.toThrow('allowClear option must be set to true')
      })
      it('allows clear when allowClear true', async () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient })
        await expect(driver.clear('', {})).resolves.toBeUndefined()
      })
      it('still checks readOnly first', async () => {
        const driver = makeDriver({ ...defaultOptionsBase, s3Client: mockClient, readOnly: true })
        await expect(driver.clear('', {})).rejects.toThrow('driver is in read-only mode')
      })
    })
  })
}

// Register the common suite for both base and flex drivers
describe('aws-s3 base driver (common)', () => {
  registerAwsS3CommonTests({
    label: 'base',
    makeDriver: (opts) => awsS3Driver(opts),
  })

  it('uses default driver name when name omitted', () => {
    const driver = awsS3Driver({ s3Client: new MockS3Client() as any, bucket: 'bucket-1' })
    expect(driver.name).toBe(AWS_S3_DRIVER_NAME)
  })
})

describe('aws-s3 flex driver (common)', () => {
  registerAwsS3CommonTests({
    label: 'flex',
    makeDriver: (opts) => awsS3FlexDriver(opts),
  })

  it('uses default driver name when name omitted', () => {
    const driver = awsS3FlexDriver({ s3Client: new MockS3Client() as any, bucket: 'bucket-1' })
    expect(driver.name).toBe(AWS_S3_FLEX_DRIVER_NAME)
  })
})
