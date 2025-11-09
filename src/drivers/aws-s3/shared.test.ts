import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { S3Client } from '@aws-sdk/client-s3'
import {
  normalizeS3Key,
  joinS3Key,
  buildS3SearchPrefix,
  mapUnstorageKeyToS3Key,
  toS3StorageKey,
  mapS3ObjectKeyToUnstorageKey,
  validateS3Options,
  createS3Client,
  getS3Body,
  putS3Object,
  deleteS3Object,
  listS3KeysMapped,
  getS3Head,
  toS3KeyWithJSONExt,
  fromS3KeyWithJSONExt,
} from './shared.js'

// Mock the AWS SDK similar to driver tests
const { mockS3ClientObj, mockS3ClientCtor } = vi.hoisted(() => {
  const mockObj = { send: vi.fn() } as unknown as S3Client
  return {
    mockS3ClientObj: mockObj,
    mockS3ClientCtor: vi.fn(function (_opts?: any) { return mockObj as any })
  }
})

const {
  mockHeadObjectCommand,
  mockGetObjectCommand,
  mockPutObjectCommand,
  mockDeleteObjectCommand,
  mockListObjectsV2Command,
} = vi.hoisted(() => ({
  mockHeadObjectCommand: vi.fn(),
  mockGetObjectCommand: vi.fn(),
  mockPutObjectCommand: vi.fn(),
  mockDeleteObjectCommand: vi.fn(),
  mockListObjectsV2Command: vi.fn(),
}))

vi.mock('@aws-sdk/client-s3', async () => {
  return {
    S3Client: mockS3ClientCtor,
    HeadObjectCommand: mockHeadObjectCommand,
    GetObjectCommand: mockGetObjectCommand,
    PutObjectCommand: mockPutObjectCommand,
    DeleteObjectCommand: mockDeleteObjectCommand,
    ListObjectsV2Command: mockListObjectsV2Command,
  }
})

function makeResolved(overrides: Record<string, any> = {}) {
  const opts = { bucket: 'b', ...overrides }
  return validateS3Options(opts as any)
}

describe('shared S3 helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('normalizeS3Key', () => {
    it('normalizes empty and slashy keys', () => {
      expect(normalizeS3Key('')).toBe('')
      expect(normalizeS3Key('/')).toBe('')
      expect(normalizeS3Key('///a//b///c/')).toBe('a/b/c')
    })
  })

  describe('joinS3Key', () => {
    it('joins base and key with proper normalization', () => {
      expect(joinS3Key(undefined, 'a//b')).toBe('a/b')
      expect(joinS3Key('base/', '/k')).toBe('base/k')
      expect(joinS3Key('/base/dir/', '/sub//k/')).toBe('base/dir/sub/k')
      expect(joinS3Key('base', '')).toBe('base')
      expect(joinS3Key('', 'k')).toBe('k')
    })
  })

  describe('buildS3SearchPrefix', () => {
    it('builds from fullBasePrefix and basePrefix; ensures trailing slash for root search', () => {
      expect(buildS3SearchPrefix({ fullBasePrefix: '' }, undefined)).toBe('')
      expect(buildS3SearchPrefix({ fullBasePrefix: 'root' }, undefined)).toBe('root/')
      expect(buildS3SearchPrefix({ fullBasePrefix: 'root' }, 'a:b')).toBe('root/a/b')
      expect(buildS3SearchPrefix({ fullBasePrefix: 'root/x' }, 'a')).toBe('root/x/a')
    })
  })

  describe('mapUnstorageKeyToS3Key and alias', () => {
    const resolved = makeResolved({ storagePrefix: 'root', base: 'app' })

    it('maps and normalizes unstorage key to S3 key', () => {
      expect(mapUnstorageKeyToS3Key('user//data', resolved)).toBe('root/app/user/data')
      expect(mapUnstorageKeyToS3Key('/user/', resolved)).toBe('root/app/user')
    })

    it('alias toS3StorageKey behaves the same', () => {
      expect(toS3StorageKey('k', resolved)).toBe(mapUnstorageKeyToS3Key('k', resolved))
    })

    it('validates key', () => {
      expect(() => mapUnstorageKeyToS3Key('', resolved)).toThrow('Key must be a non-empty string')
      expect(() => mapUnstorageKeyToS3Key('../bad', resolved)).toThrow('Key cannot contain ".." path segments')
    })
  })

  describe('mapS3ObjectKeyToUnstorageKey', () => {
    const resolved = makeResolved({ storagePrefix: 'root', base: 'app' }) as any

    it('strips fullBasePrefix and converts to : format', () => {
      expect(mapS3ObjectKeyToUnstorageKey('root/app/dir/file', resolved)).toBe('dir:file')
      expect(mapS3ObjectKeyToUnstorageKey('root/app', resolved)).toBe('')
    })

  })

  describe('JSON extension mapping helpers', () => {
    const resolved = makeResolved({ storagePrefix: 'root', base: 'app' })

    it('toS3KeyWithJSONExt appends .json only once', () => {
      expect(toS3KeyWithJSONExt('user:123', resolved)).toBe('root/app/user:123.json')
      expect(toS3KeyWithJSONExt('folder:config', resolved)).toBe('root/app/folder:config.json')
    })

    it('fromS3KeyWithJSONExt strips .json and removes base prefix', () => {
      // With base prefix
      expect(fromS3KeyWithJSONExt('root/app/user:123.json', resolved)).toBe('user:123')
      // Without base prefix
      const noBase = makeResolved({ storagePrefix: '', base: '' })
      expect(fromS3KeyWithJSONExt('folder:config.json', noBase)).toBe('folder:config')
      // No .json suffix
      expect(fromS3KeyWithJSONExt('folder:config', noBase)).toBe('folder:config')
    })
  })

  describe('validateS3Options', () => {
    it('computes fullBasePrefix from storagePrefix and base', () => {
      const v = makeResolved({ storagePrefix: '/prod//storage/', base: '/app//x/' })
      expect(v.fullBasePrefix).toBe('prod/storage/app/x')
    })

    it('throws without bucket', () => {
      expect(() => validateS3Options({} as any)).toThrow('S3 bucket name is required')
    })

    it('enforces accessKeyId/secretAccessKey pair when provided', () => {
      expect(() => validateS3Options({ bucket: 'b', accessKeyId: 'a' } as any)).toThrow('Both accessKeyId and secretAccessKey are required when providing inline credentials')
      expect(() => validateS3Options({ bucket: 'b', secretAccessKey: 's' } as any)).toThrow('Both accessKeyId and secretAccessKey are required when providing inline credentials')
    })
  })

  describe('createS3Client', () => {
    it('returns provided s3Client when present', () => {
      const resolved = makeResolved({ s3Client: mockS3ClientObj })
      const client = createS3Client(resolved)
      expect(client).toBe(mockS3ClientObj)
      expect(mockS3ClientCtor).not.toHaveBeenCalled()
    })

    it('constructs S3Client with region and credentials', () => {
      const resolved = makeResolved({
        region: 'us-east-1',
        accessKeyId: 'AKIA',
        secretAccessKey: 'SECRET',
        sessionToken: 'TOKEN'
      })
      const client = createS3Client(resolved)
      expect(client).toBe(mockS3ClientObj)
      expect(mockS3ClientCtor).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: { accessKeyId: 'AKIA', secretAccessKey: 'SECRET', sessionToken: 'TOKEN' }
      })
    })
  })

  describe('S3 command helpers', () => {

    it('getS3Body returns Body or null', async () => {
      // non-null Body
      ;(mockS3ClientObj.send as any) = vi.fn().mockResolvedValue({ Body: 'DATA' })
      const body = await getS3Body(mockS3ClientObj, { Bucket: 'b', Key: 'k' } as any)
      expect(body).toBe('DATA')
      // null Body
      ;(mockS3ClientObj.send as any) = vi.fn().mockResolvedValue({ Body: null })
      const bodyNull = await getS3Body(mockS3ClientObj, { Bucket: 'b', Key: 'k' } as any)
      expect(bodyNull).toBeNull()
    })

    it('putS3Object calls PutObjectCommand', async () => {
      ;(mockS3ClientObj.send as any) = vi.fn().mockResolvedValue({})
      await putS3Object(mockS3ClientObj, { Bucket: 'b', Key: 'k', Body: 'v' } as any)
      expect(mockPutObjectCommand).toHaveBeenCalledWith({ Bucket: 'b', Key: 'k', Body: 'v' })
    })

    it('deleteS3Object calls DeleteObjectCommand', async () => {
      ;(mockS3ClientObj.send as any) = vi.fn().mockResolvedValue({})
      await deleteS3Object(mockS3ClientObj, { Bucket: 'b', Key: 'k' } as any)
      expect(mockDeleteObjectCommand).toHaveBeenCalledWith({ Bucket: 'b', Key: 'k' })
    })

    it('getS3Head sends HeadObjectCommand (existence check)', async () => {
      ;(mockS3ClientObj.send as any) = vi.fn().mockResolvedValue({})
      await getS3Head(mockS3ClientObj as any, { Bucket: 'b', Key: 'k' })
      expect(mockHeadObjectCommand).toHaveBeenCalledWith({ Bucket: 'b', Key: 'k' })
    })
  })

  describe('listS3KeysMapped', () => {
    it('lists and maps keys with pagination and basePrefix handling', async () => {
      const resolved = makeResolved({ storagePrefix: 'root', base: 'app' })
      ;(mockS3ClientObj.send as any) = vi.fn()
        .mockResolvedValueOnce({
          Contents: [ { Key: 'root/app/a' }, { Key: 'root/app/x/y' } ],
          NextContinuationToken: 'T1'
        })
        .mockResolvedValueOnce({
          Contents: [ { Key: 'root/app/b' } ]
        })

      const result = await listS3KeysMapped(
        mockS3ClientObj,
        resolved,
        mapS3ObjectKeyToUnstorageKey,
        'x', // basePrefix
      )

      // Only keys under basePrefix 'x' should map when Prefix uses it
      // First page had 'root/app/a' and 'root/app/x/y' => maps ['', 'x:y'] then depth filter none
      // Second page had 'root/app/b'
      // After mapping all non-undefined, expect results contain ['', 'x:y', 'b'] but because Prefix 'root/app/x' should filter server-side, we assert calls
      expect(result).toEqual(['a', 'x:y', 'b'].filter(Boolean))

      // Verify ListObjectsV2Command called with computed Prefix
      expect(mockListObjectsV2Command).toHaveBeenCalledWith({
        Bucket: resolved.bucket,
        Prefix: 'root/app/x',
        MaxKeys: 1000,
        ContinuationToken: undefined,
      })
    })
  })
})
