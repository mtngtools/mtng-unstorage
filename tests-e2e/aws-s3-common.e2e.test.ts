/**
 * Common E2E tests for AWS S3 drivers.
 *
 * These tests run against real S3 only when AWS_S3_E2E_ENABLED=true.
 * They mirror the setup patterns used in the existing per-driver E2E files,
 * but consolidate the behavioral tests to avoid duplication.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createStorage } from 'unstorage'
import { S3Client } from '@aws-sdk/client-s3'

// Import drivers using the same relative style as existing E2E files
import awsS3Driver from '../src/drivers/aws-s3/aws-s3'
import awsS3FlexDriver from '../src/drivers/aws-s3/aws-s3-flex'

type MakeDriver = (args: {
  s3Client: S3Client
  bucket: string
  storagePrefix: string
  base: string
}) => any

function registerAwsS3CommonE2ETests(args: {
  label: string
  base: string
  makeDriver: MakeDriver
}) {
  const { label, base, makeDriver } = args

  const isE2EEnabled = process.env.AWS_S3_E2E_ENABLED === 'true'
  const bucket = process.env.AWS_S3_TEST_BUCKET || 'test-bucket-not-set'
  const baseStoragePrefix = process.env.AWS_S3_TEST_PREFIX || 'test-mtng-unstorage-e2e'

  
  // Random suffix to isolate this test run via storagePrefix
  const TEST_NS = `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const storagePrefix = `${String(baseStoragePrefix).replace(/\/+$/, '')}/${TEST_NS}`
  
  console.debug(`AWS S3 E2E tests for:` , {label,bucket, storagePrefix, base })


  // When E2E isn’t enabled, skip the whole suite cleanly
  const d = isE2EEnabled ? describe : describe.skip

  d(`[e2e] aws-s3 ${label} common`, () => {
    let storage: ReturnType<typeof createStorage>
    let s3Client: S3Client

    beforeEach(async () => {
      const region = process.env.AWS_REGION
      s3Client = new S3Client({ region })

      storage = createStorage({
        driver: makeDriver({ s3Client, bucket, storagePrefix, base })
      })

      // Clean up any existing test data under this isolated storagePrefix
      await storage.clear('')
    })

    afterEach(async () => {
      if (!storage) return
        // Clean up only within this isolated storagePrefix
        await storage.clear('')
    })

    it('set/get/remove roundtrip for JSON values', async () => {
  const key = `user:123`
      const value = { name: 'Alice', email: 'alice@example.com' }

      await storage.setItem(key, value)
      await expect(storage.hasItem(key)).resolves.toBe(true)
      await expect(storage.getItem(key)).resolves.toEqual(value)

      await storage.removeItem(key)
      await expect(storage.hasItem(key)).resolves.toBe(false)
      await expect(storage.getItem(key)).resolves.toBeNull()
    })

    it('getKeys returns keys written', async () => {
      const items: Record<string, any> = {
        ['k1']: 'v1',
        ['folder:k2']: 'v2',
        ['folder:sub:k3']: 'v3'
      }
      for (const [k, v] of Object.entries(items)) {
        await storage.setItem(k, v)
      }

      const keys = (await storage.getKeys('')).sort()
      expect(keys).toEqual(Object.keys(items).sort())

      // Cleanup: remove the keys we created
      for (const k of Object.keys(items)) {
        await storage.removeItem(k)
      }
    })

    it('respects maxDepth when listing keys within a base', async () => {
      const items: Record<string, any> = {
        ["depth0"]: 'v0',
        ["depth0:file1"]: 'v1',
        ["depth0:sub:file2"]: 'v2',
        ["depth0:sub:sub2:file3"]: 'v3'
      }
      for (const [k, v] of Object.entries(items)) {
        await storage.setItem(k, v)
      }

      expect((await storage.getKeys("", { maxDepth: 0 })).sort()).toEqual(["depth0"])
      expect((await storage.getKeys("", { maxDepth: 1 })).sort()).toEqual(["depth0", "depth0:file1"].sort())
      expect((await storage.getKeys("", { maxDepth: 2 })).sort()).toEqual(["depth0", "depth0:file1", "depth0:sub:file2"].sort())
      expect((await storage.getKeys("", { maxDepth: 3 })).sort()).toEqual(Object.keys(items).sort())
      // Cleanup
      for (const k of Object.keys(items)) {
        await storage.removeItem(k)
      }
    })

    it('clear removes keys within this storagePrefix', async () => {
      const keys = ['a', 'b']
      for (const k of keys) await storage.setItem(k, 'v')

      await storage.clear('')

      for (const k of keys) {
        await expect(storage.hasItem(k)).resolves.toBe(false)
      }
    })
  })
}

// Register base driver tests
registerAwsS3CommonE2ETests({
  label: 'base',
  base: 'aws-s3/',
  makeDriver: ({ s3Client, bucket, storagePrefix, base }) =>
    awsS3Driver({ s3Client, bucket, storagePrefix, base, allowClear: true })
})

// Register flex driver tests
registerAwsS3CommonE2ETests({
  label: 'flex',
  base: 'aws-s3-flex/',
  makeDriver: ({ s3Client, bucket, storagePrefix, base }) =>
    awsS3FlexDriver({ s3Client, bucket, storagePrefix, base, allowClear: true })
})
