import { describe, it, expect, vi, beforeEach } from 'vitest';
import awsS3FlexDriver, { toStorageKey } from './aws-s3-flex.js';
import type { S3Client } from '@aws-sdk/client-s3';

// Reuse the same mocks as the basic driver tests
const mockS3Client = {
  send: vi.fn()
} as unknown as S3Client;

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

describe('S3 Flex Driver (phase1 parity)', () => {
  const defaultOptions = {
    s3Client: mockS3Client,
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

  it('toStorageKey should behave like basic driver', () => {
    expect(toStorageKey('test-key', {})).toBe('test-key')
    expect(toStorageKey('/test-key/', { s3StoragePrefix: '/storage/' })).toBe('storage/test-key')
  })
})
