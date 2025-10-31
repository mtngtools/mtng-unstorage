import { describe, it, expect, vi, beforeEach } from 'vitest';
import awsS3Driver, { toStorageKey } from './aws-s3.js';
import type { S3Client } from '@aws-sdk/client-s3';

// Mock the AWS SDK
const mockS3Client = {
  send: vi.fn()
} as unknown as S3Client;

// Mock the AWS SDK commands
const mockHeadObjectCommand = vi.fn();
const mockGetObjectCommand = vi.fn();
const mockPutObjectCommand = vi.fn();
const mockDeleteObjectCommand = vi.fn();
const mockListObjectsV2Command = vi.fn();

vi.mock('@aws-sdk/client-s3', async () => {
  return {
    HeadObjectCommand: mockHeadObjectCommand,
    GetObjectCommand: mockGetObjectCommand,
    PutObjectCommand: mockPutObjectCommand,
    DeleteObjectCommand: mockDeleteObjectCommand,
    ListObjectsV2Command: mockListObjectsV2Command
  }
})

describe('S3 Driver', () => {
  const defaultOptions = {
    s3Client: mockS3Client,
    bucket: 'test-bucket',
    s3StoragePrefix: 'test-prefix/',
    name: 'test-s3',
    allowClear: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create driver with valid options', () => {
      const driver = awsS3Driver(defaultOptions)
      expect(driver.name).toBe('test-s3')
    })

    it('should throw error if client is missing', () => {
      expect(() => awsS3Driver({
        ...defaultOptions,
        s3Client: null as any
      })).toThrow('S3Client instance is required')
    })

    it('should throw error if bucket is missing', () => {
      expect(() => awsS3Driver({
        ...defaultOptions,
        bucket: ''
      })).toThrow('S3 bucket name is required')
    })

    it('should use default name if not provided', () => {
      const driver = awsS3Driver({
        s3Client: mockS3Client,
        bucket: 'test-bucket'
      })
      expect(driver.name).toBe('aws-s3')
    })
  })

  describe('hasItem', () => {
    it('should return true when object exists', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({})
      const driver = awsS3Driver(defaultOptions)
      
      const result = await driver.hasItem('test-key', {})
      
      expect(result).toBe(true)
      expect(mockHeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-prefix/test-key'
      })
    })

    it('should return false when object does not exist', async () => {
      const notFoundError = new Error('Not Found')
      notFoundError.name = 'NotFound'
      mockS3Client.send = vi.fn().mockRejectedValue(notFoundError)
      
      const driver = awsS3Driver(defaultOptions)
      const result = await driver.hasItem('test-key', {})
      
      expect(result).toBe(false)
    })

    it('should return false when 404 status code', async () => {
      const notFoundError = new Error('Not Found')
      ;(notFoundError as any).$metadata = { httpStatusCode: 404 }
      mockS3Client.send = vi.fn().mockRejectedValue(notFoundError)
      
      const driver = awsS3Driver(defaultOptions)
      const result = await driver.hasItem('test-key', {})
      
      expect(result).toBe(false)
    })

    it('should throw other errors', async () => {
      const error = new Error('Access Denied')
      mockS3Client.send = vi.fn().mockRejectedValue(error)
      
      const driver = awsS3Driver(defaultOptions)
      
      await expect(driver.hasItem('test-key', {})).rejects.toThrow('Access Denied')
    })
  })

  describe('getItem', () => {
    it('should return parsed JSON value', async () => {
      const mockBody = {
        transformToString: vi.fn().mockResolvedValue('{"test":"value"}')
      }
      mockS3Client.send = vi.fn().mockResolvedValue({ Body: mockBody })
      
      const driver = awsS3Driver(defaultOptions)
      const result = await driver.getItem('test-key')
      
      expect(result).toBe('{"test":"value"}')
      expect(mockGetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-prefix/test-key'
      })
    })

    it('should return string value for non-JSON content', async () => {
      const mockBody = {
        transformToString: vi.fn().mockResolvedValue('plain text')
      }
      mockS3Client.send = vi.fn().mockResolvedValue({ Body: mockBody })
      
      const driver = awsS3Driver(defaultOptions)
      const result = await driver.getItem('test-key')
      
      expect(result).toBe('plain text')
    })

    it('should return null when object does not exist', async () => {
      const notFoundError = new Error('No Such Key')
      notFoundError.name = 'NoSuchKey'
      mockS3Client.send = vi.fn().mockRejectedValue(notFoundError)
      
      const driver = awsS3Driver(defaultOptions)
      const result = await driver.getItem('test-key')
      
      expect(result).toBe(null)
    })

    it('should return null when body is empty', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({ Body: null })
      
      const driver = awsS3Driver(defaultOptions)
      const result = await driver.getItem('test-key')
      
      expect(result).toBe(null)
    })

    it('should handle Node.js stream body', async () => {
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('{"test"'))
            callback(Buffer.from(':"value"}'))
          } else if (event === 'end') {
            callback()
          }
        })
      }
      
      mockS3Client.send = vi.fn().mockResolvedValue({ Body: mockStream })
      
      const driver = awsS3Driver(defaultOptions)
      const result = await driver.getItem('test-key')
      
      expect(result).toBe('{"test":"value"}')
    })
  })

  describe('setItem', () => {
    it('should store JSON serialized value', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({})
      
      const driver = awsS3Driver(defaultOptions)
      await driver.setItem!('test-key', '{"test":"value"}', {})
      
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-prefix/test-key',
        Body: '{"test":"value"}'
      })
    })

    it('should store string value as-is', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({})
      
      const driver = awsS3Driver(defaultOptions)
      await driver.setItem!('test-key', 'plain text', {})
      
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-prefix/test-key',
        Body: 'plain text'
      })
    })

    it('should pass custom S3 options to PutObjectCommand', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({})
      
      const driver = awsS3Driver(defaultOptions)
      await driver.setItem!('test-key', 'test content', {
        s3Options: {
          ContentType: 'text/plain',
          CacheControl: 'max-age=3600',
          Metadata: {
            author: 'test-user',
            department: 'engineering'
          },
          ServerSideEncryption: 'AES256'
        }
      })
      
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-prefix/test-key',
        Body: 'test content',
        ContentType: 'text/plain',
        CacheControl: 'max-age=3600',
        Metadata: {
          author: 'test-user',
          department: 'engineering'
        },
        ServerSideEncryption: 'AES256'
      })
    })
  })

  describe('removeItem', () => {
    it('should delete object from S3', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({})
      
      const driver = awsS3Driver(defaultOptions)
      await driver.removeItem!('test-key', {})
      
      expect(mockDeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-prefix/test-key'
      })
    })
  })

  describe('getKeys', () => {
    it('should return list of keys', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({
        Contents: [
          { Key: 'test-prefix/key1' },
          { Key: 'test-prefix/key2' },
          { Key: 'test-prefix/folder/key3' }
        ]
      })
      
      const driver = awsS3Driver(defaultOptions)
      const keys = await driver.getKeys('', {})
      
      expect(keys).toEqual(['key1', 'key2', 'folder:key3'])
      expect(mockListObjectsV2Command).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Prefix: 'test-prefix/',
        MaxKeys: 1000
      })
    })

    it('should handle pagination', async () => {
      mockS3Client.send = vi.fn()
        .mockResolvedValueOnce({
          Contents: [{ Key: 'test-prefix/key1' }],
          NextContinuationToken: 'token123'
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'test-prefix/key2' }]
        })
      
      const driver = awsS3Driver(defaultOptions)
      const keys = await driver.getKeys('', {})
      
      expect(keys).toEqual(['key1', 'key2'])
      expect(mockS3Client.send).toHaveBeenCalledTimes(2)
    })

    it('should filter by base prefix', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({
        Contents: [
          { Key: 'test-prefix/base/key1' },
          { Key: 'test-prefix/base/key2' }
        ]
      })
      
      const driver = awsS3Driver(defaultOptions)
      const keys = await driver.getKeys('base', {})
      
      expect(keys).toEqual(['base:key1', 'base:key2'])
      expect(mockListObjectsV2Command).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Prefix: 'test-prefix/base',
        MaxKeys: 1000
      })
    })

    it('should support maxDepth filtering', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({
        Contents: [
          { Key: 'test-prefix/depth0' },
          { Key: 'test-prefix/depth0/file1' },
          { Key: 'test-prefix/depth0/sub1/file2' },
          { Key: 'test-prefix/depth0/sub1/sub2/file3' },
          { Key: 'test-prefix/depth0/sub1/sub2/sub3/file4' }
        ]
      })
      
      const driver = awsS3Driver(defaultOptions)
      
      // maxDepth: 0 should only return top-level keys (no ':' separators)
      const depth0Keys = await driver.getKeys('', { maxDepth: 0 })
      expect(depth0Keys.sort()).toEqual(['depth0'])
      
      // maxDepth: 1 should include keys with 1 ':' separator
      const depth1Keys = await driver.getKeys('', { maxDepth: 1 })
      expect(depth1Keys.sort()).toEqual(['depth0', 'depth0:file1'].sort())
      
      // maxDepth: 2 should include keys with up to 2 ':' separators  
      const depth2Keys = await driver.getKeys('', { maxDepth: 2 })
      expect(depth2Keys.sort()).toEqual(['depth0', 'depth0:file1', 'depth0:sub1:file2'].sort())
      
      // No maxDepth should return all keys
      const allKeys = await driver.getKeys('', {})
      expect(allKeys.sort()).toEqual([
        'depth0',
        'depth0:file1', 
        'depth0:sub1:file2',
        'depth0:sub1:sub2:file3',
        'depth0:sub1:sub2:sub3:file4'
      ].sort())
    })
  })

  describe('clear', () => {
    it('should delete all keys', async () => {
      // Mock ListObjectsV2Command to return some keys
      mockS3Client.send = vi.fn()
        .mockResolvedValueOnce({
          Contents: [
            { Key: 'test-s3-prefix/test-base/key1' },
            { Key: 'test-s3-prefix/test-base/key2' },
            { Key: 'test-s3-prefix/test-base/key3' }
          ]
        })
        .mockResolvedValue({}) // For delete operations
      
      const driver = awsS3Driver(defaultOptions)
      await driver.clear!('', {})
      
      // Should call ListObjectsV2Command once and DeleteObjectCommand 3 times
      expect(mockS3Client.send).toHaveBeenCalledTimes(4)
    })

    it('should handle large number of keys in batches', async () => {
      const manyKeys = Array.from({ length: 250 }, (_, i) => ({ Key: `test-s3-prefix/test-base/key${i}` }))
      
      // Mock ListObjectsV2Command to return many keys
      mockS3Client.send = vi.fn()
        .mockResolvedValueOnce({
          Contents: manyKeys
        })
        .mockResolvedValue({}) // For delete operations
      
      const driver = awsS3Driver(defaultOptions)
      await driver.clear!('', {})
      
      // Should call ListObjectsV2Command once and DeleteObjectCommand 250 times
      expect(mockS3Client.send).toHaveBeenCalledTimes(251)
    })
  })

  describe('key normalization', () => {
    it('should normalize keys with base path', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({})
      
      const driver = awsS3Driver({
        ...defaultOptions,
        base: 'my-base'
      })
      
      await driver.setItem!('test-key', 'value', {})
      
      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-prefix/my-base/test-key',
        Body: 'value'
      })
    })

    it('should validate keys', async () => {
      const driver = awsS3Driver(defaultOptions)
      
      await expect(driver.setItem!('', 'value', {})).rejects.toThrow('Key must be a non-empty string')
      await expect(driver.setItem!('../invalid', 'value', {})).rejects.toThrow('Key cannot contain ".." path segments')
    })
  })

  describe('readOnly mode', () => {
    const readOnlyOptions = {
      ...defaultOptions,
      readOnly: true
    }

    it('should prevent setItem when readOnly is true', async () => {
      const driver = awsS3Driver(readOnlyOptions)
      
      await expect(driver.setItem!('test-key', 'value', {}))
        .rejects.toThrow('Cannot perform setItem: driver is in read-only mode')
    })

    it('should prevent removeItem when readOnly is true', async () => {
      const driver = awsS3Driver(readOnlyOptions)
      
      await expect(driver.removeItem!('test-key', {}))
        .rejects.toThrow('Cannot perform removeItem: driver is in read-only mode')
    })

    it('should prevent clear when readOnly is true', async () => {
      const driver = awsS3Driver(readOnlyOptions)
      
      await expect(driver.clear!('', {}))
        .rejects.toThrow('Cannot perform clear: driver is in read-only mode')
    })

    it('should allow read operations when readOnly is true', async () => {
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('test value'))
          } else if (event === 'end') {
            callback()
          }
        })
      }
      
      mockS3Client.send = vi.fn()
        .mockResolvedValueOnce({
          Body: mockStream
        })
        .mockResolvedValueOnce({}) // For hasItem
        .mockResolvedValueOnce({
          Contents: [{ Key: 'test-prefix/key1' }]
        })

      const driver = awsS3Driver(readOnlyOptions)
      
      // These should all work in read-only mode
      await expect(driver.getItem('test-key', {})).resolves.toBe('test value')
      await expect(driver.hasItem('test-key', {})).resolves.toBe(true)
      await expect(driver.getKeys('', {})).resolves.toEqual(['key1'])
    })

    it('should allow write operations when readOnly is false or undefined', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({})
      
      const driver = awsS3Driver(defaultOptions) // readOnly is false/undefined
      
      // These should not throw errors
      await expect(driver.setItem!('test-key', 'value', {})).resolves.toBeUndefined()
      await expect(driver.removeItem!('test-key', {})).resolves.toBeUndefined()
      await expect(driver.clear!('', {})).resolves.toBeUndefined()
    })
  })

  describe('allowClear option', () => {
    const noClearOptions = {
      ...defaultOptions,
      allowClear: false
    }

    it('should prevent clear when allowClear is false', async () => {
      const driver = awsS3Driver(noClearOptions)
      
      await expect(driver.clear!('', {}))
        .rejects.toThrow('Cannot perform clear: allowClear option must be set to true')
    })

    it('should prevent clear when allowClear is undefined (default)', async () => {
      const { allowClear, ...optionsWithoutAllowClear } = defaultOptions
      const driver = awsS3Driver(optionsWithoutAllowClear)
      
      await expect(driver.clear!('', {}))
        .rejects.toThrow('Cannot perform clear: allowClear option must be set to true')
    })

    it('should allow clear when allowClear is true', async () => {
      mockS3Client.send = vi.fn().mockResolvedValue({})
      
      const driver = awsS3Driver(defaultOptions) // allowClear is true
      
      await expect(driver.clear!('', {})).resolves.toBeUndefined()
    })

    it('should still check readOnly before allowClear', async () => {
      const readOnlyWithAllowClearOptions = {
        ...defaultOptions,
        readOnly: true,
        allowClear: true
      }
      
      const driver = awsS3Driver(readOnlyWithAllowClearOptions)
      
      // Should fail due to readOnly, not allowClear
      await expect(driver.clear!('', {}))
        .rejects.toThrow('Cannot perform clear: driver is in read-only mode')
    })
  })

  describe('toStorageKey', () => {
    describe('basic functionality', () => {
      it('should return key as-is with empty options', () => {
        expect(toStorageKey('test-key', {})).toBe('test-key')
      })

      it('should normalize keys by removing leading/trailing slashes', () => {
        expect(toStorageKey('/test-key/', {})).toBe('test-key')
        expect(toStorageKey('///test-key///', {})).toBe('test-key')
      })

      it('should normalize multiple consecutive slashes', () => {
        expect(toStorageKey('path//to///key', {})).toBe('path/to/key')
      })
    })

    describe('with base path', () => {
      it('should prepend base path to key', () => {
        expect(toStorageKey('test-key', { base: 'app' })).toBe('app/test-key')
      })

      it('should handle base with slashes', () => {
        expect(toStorageKey('test-key', { base: '/app/' })).toBe('app/test-key')
        expect(toStorageKey('/test-key/', { base: '/app/' })).toBe('app/test-key')
      })

      it('should handle nested base paths', () => {
        expect(toStorageKey('user/data', { base: 'app/users' })).toBe('app/users/user/data')
      })

      it('should handle empty base', () => {
        expect(toStorageKey('test-key', { base: '' })).toBe('test-key')
        expect(toStorageKey('test-key', { base: undefined })).toBe('test-key')
      })
    })

    describe('with s3StoragePrefix', () => {
      it('should prepend s3StoragePrefix to key', () => {
        expect(toStorageKey('test-key', { s3StoragePrefix: 'storage' })).toBe('storage/test-key')
      })

      it('should handle s3StoragePrefix with slashes', () => {
        expect(toStorageKey('test-key', { s3StoragePrefix: '/storage/' })).toBe('storage/test-key')
        expect(toStorageKey('/test-key/', { s3StoragePrefix: '/storage/' })).toBe('storage/test-key')
      })

      it('should handle nested s3StoragePrefix', () => {
        expect(toStorageKey('user/data', { s3StoragePrefix: 'prod/storage' })).toBe('prod/storage/user/data')
      })

      it('should handle empty s3StoragePrefix', () => {
        expect(toStorageKey('test-key', { s3StoragePrefix: '' })).toBe('test-key')
        expect(toStorageKey('test-key', { s3StoragePrefix: undefined })).toBe('test-key')
      })
    })

    describe('with both base and s3StoragePrefix', () => {
      it('should apply s3StoragePrefix first, then base', () => {
        expect(toStorageKey('test-key', { 
          base: 'app', 
          s3StoragePrefix: 'storage' 
        })).toBe('storage/app/test-key')
      })

      it('should handle complex nested paths', () => {
        expect(toStorageKey('user/profile/data', { 
          base: 'app/users', 
          s3StoragePrefix: 'prod/storage' 
        })).toBe('prod/storage/app/users/user/profile/data')
      })

      it('should normalize all path components', () => {
        expect(toStorageKey('/user//profile///data/', { 
          base: '/app//users/', 
          s3StoragePrefix: '//prod///storage//' 
        })).toBe('prod/storage/app/users/user/profile/data')
      })
    })

    describe('edge cases', () => {
      it('should handle empty key', () => {
        expect(() => toStorageKey('', {})).toThrow('Key must be a non-empty string')
      })

      it('should reject keys with path traversal', () => {
        expect(() => toStorageKey('../test', {})).toThrow('Key cannot contain ".." path segments')
        expect(() => toStorageKey('test/../other', {})).toThrow('Key cannot contain ".." path segments')
        expect(() => toStorageKey('test/..', {})).toThrow('Key cannot contain ".." path segments')
      })

      it('should reject non-string keys', () => {
        expect(() => toStorageKey(null as any, {})).toThrow('Key must be a non-empty string')
        expect(() => toStorageKey(undefined as any, {})).toThrow('Key must be a non-empty string')
        expect(() => toStorageKey(42 as any, {})).toThrow('Key must be a non-empty string')
        expect(() => toStorageKey({} as any, {})).toThrow('Key must be a non-empty string')
      })

      it('should handle only slashes in paths', () => {
        expect(toStorageKey('key', { base: '///' })).toBe('key')
        expect(toStorageKey('key', { s3StoragePrefix: '///' })).toBe('key')
        expect(toStorageKey('key', { base: '///', s3StoragePrefix: '///' })).toBe('key')
      })
    })
  })
})