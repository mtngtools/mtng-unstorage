/**
 * E2E tests for aws-s3-flex driver using JSON extension mapping helpers.
 * Gated by AWS_S3_E2E_ENABLED=true. Uses storagePrefix suffix isolation.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createStorage } from 'unstorage';
import awsS3FlexDriver from '../src/drivers/aws-s3/aws-s3-flex';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { joinS3Key, toS3KeyWithJSONExt, fromS3KeyWithJSONExt } from '../src/drivers/aws-s3/shared';

const isE2EEnabled = process.env.AWS_S3_E2E_ENABLED === 'true';
const d = isE2EEnabled ? describe : describe.skip;

const bucket = process.env.AWS_S3_TEST_BUCKET || 'test-bucket-not-set';
const baseStoragePrefix = process.env.AWS_S3_TEST_PREFIX || 'test-mtng-unstorage-e2e';
const TEST_NS = `it-flex-json-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const storagePrefix = `${String(baseStoragePrefix).replace(/\/+$/, '')}/${TEST_NS}`;
const base = 'aws-s3-flex/';

d('[e2e] AWS S3 FLEX Driver JSON mapping', () => {
  let storage: ReturnType<typeof createStorage>;
  let s3Client: S3Client;
  let fullBasePrefix: string;

  beforeEach(async () => {
    const region = process.env.AWS_REGION;
    s3Client = new S3Client({ region });

    storage = createStorage({
      driver: awsS3FlexDriver({
        s3Client,
        bucket,
        storagePrefix,
        base,
        allowClear: true,
        toStorageKey: (key, resolved, req) => toS3KeyWithJSONExt(key, { fullBasePrefix: resolved.fullBasePrefix }, req),
        fromStorageKey: (key, resolved, req) => fromS3KeyWithJSONExt(key, { fullBasePrefix: resolved.fullBasePrefix }, req),
      })
    });

    // Mirror fullBasePrefix joining used by driver
    fullBasePrefix = joinS3Key(storagePrefix, base);

    // Clean scope
    await storage.clear('');
  });

  afterEach(async () => {
    if (!storage) return;
    await storage.clear('');
  });

  it('use custom key mapping to roundtrip with .json extension', async () => {
    const logicalKey = 'user:123';
    const value = { hello: 'world' };

    await storage.setItem(logicalKey, value);
    await expect(storage.hasItem(logicalKey)).resolves.toBe(true);
    await expect(storage.getItem(logicalKey)).resolves.toEqual(value);

    await storage.removeItem(logicalKey);
    await expect(storage.hasItem(logicalKey)).resolves.toBe(false);
  });

});
