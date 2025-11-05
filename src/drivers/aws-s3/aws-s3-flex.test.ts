import { describe, it, expect, vi, beforeEach } from 'vitest';
import awsS3FlexDriver from './aws-s3-flex.js';
import type { S3Client } from '@aws-sdk/client-s3';
import { toS3StorageKey } from './shared.js';

// Hoisted mocks to satisfy Vitest's hoisting behavior
const { mockS3ClientObj, mockS3ClientCtor } = vi.hoisted(() => {
  const mockObj = { send: vi.fn() } as unknown as S3Client;
  return {
    mockS3ClientObj: mockObj,
    // Use function expression so it can be used with `new`
    mockS3ClientCtor: vi.fn(function (_opts?: any) { return mockObj as any; })
  }
});

const {
  mockHeadObjectCommand,
  mockGetObjectCommand,
  mockPutObjectCommand,
  mockDeleteObjectCommand,
  mockListObjectsV2Command
} = vi.hoisted(() => {
  return {
    mockHeadObjectCommand: vi.fn(),
    mockGetObjectCommand: vi.fn(),
    mockPutObjectCommand: vi.fn(),
    mockDeleteObjectCommand: vi.fn(),
    mockListObjectsV2Command: vi.fn()
  }
});

vi.mock('@aws-sdk/client-s3', async () => {
  return {
    S3Client: mockS3ClientCtor,
    HeadObjectCommand: mockHeadObjectCommand,
    GetObjectCommand: mockGetObjectCommand,
    PutObjectCommand: mockPutObjectCommand,
    DeleteObjectCommand: mockDeleteObjectCommand,
    ListObjectsV2Command: mockListObjectsV2Command
  }
})

describe('S3 Flex Driver (phase1 parity)', () => {
  const defaultOptions = {
    s3Client: mockS3ClientObj,
    bucket: 'test-bucket',
    s3StoragePrefix: 'test-prefix/',
    name: 'test-s3-flex',
    allowClear: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create driver with valid options', () => {
    const driver = awsS3FlexDriver(defaultOptions as any)
    expect(driver.name).toBe('test-s3-flex')
  })

  it('toS3StorageKey should behave like basic driver', () => {
    expect(toS3StorageKey('test-key', {})).toBe('test-key')
    expect(toS3StorageKey('/test-key/', { s3StoragePrefix: '/storage/' })).toBe('storage/test-key')
  })
})
