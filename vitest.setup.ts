import { vi } from 'vitest';

// Mock AWS SDK for unit tests
vi.mock('@aws-sdk/client-s3', () => {
  const mockS3Client = {
    send: vi.fn()
  };

  return {
    S3Client: vi.fn(() => mockS3Client),
    GetObjectCommand: vi.fn(),
    PutObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    HeadObjectCommand: vi.fn(),
    ListObjectsV2Command: vi.fn()
  };
});