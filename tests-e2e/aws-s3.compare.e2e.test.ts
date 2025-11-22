/**
 * E2E compare tests for aws-s3 <-> aws-s3-flex interoperability.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createStorage } from 'unstorage'
import awsS3Driver from '../src/drivers/aws-s3/aws-s3'
import awsS3FlexDriver from '../src/drivers/aws-s3/aws-s3-flex'
import { mapUnstorageKeyToS3Key, mapS3ObjectKeyToUnstorageKey } from '../src/drivers/aws-s3/shared-public'
import { S3Client } from '@aws-sdk/client-s3'

describe('AWS S3 FLEX Compare E2E', () => {
  let baseStorage: ReturnType<typeof createStorage> | undefined
  let flexStorage: ReturnType<typeof createStorage> | undefined
  let mountedStorage: ReturnType<typeof createStorage> | undefined
  let s3Client: S3Client | undefined

  const isE2EEnabled = process.env.AWS_S3_E2E_ENABLED === 'true'
  const testBucket = process.env.AWS_S3_TEST_BUCKET || 'test-bucket-not-set'
  const baseTestPrefix = process.env.AWS_S3_TEST_PREFIX || 'test-mtng-unstorage-e2e/'
  const testPrefix = `aws-s3-flex-mapping/`

  beforeEach(async () => {
    if (!isE2EEnabled) return

    const region = process.env.AWS_REGION
    s3Client = new S3Client({ region })

    baseStorage = createStorage({
      driver: awsS3Driver({
        s3Client,
        bucket: testBucket,
        storagePrefix: baseTestPrefix,
        base: testPrefix,
        allowClear: true
      })
    })

    flexStorage = createStorage({
      driver: awsS3FlexDriver({
        s3Client,
        bucket: testBucket,
        storagePrefix: baseTestPrefix,
        base: testPrefix,
        allowClear: true,
        toStorageKey: mapUnstorageKeyToS3Key,
        fromStorageKey: mapS3ObjectKeyToUnstorageKey
      })
    })

    // Create unified storage with both drivers mounted
    mountedStorage = createStorage()
    mountedStorage.mount('base', awsS3Driver({
      s3Client,
      bucket: testBucket,
      storagePrefix: baseTestPrefix,
      base: testPrefix,
      allowClear: true
    }))
    mountedStorage.mount('flex', awsS3FlexDriver({
      s3Client,
      bucket: testBucket,
      storagePrefix: baseTestPrefix,
      base: testPrefix,
      allowClear: true,
      toStorageKey: mapUnstorageKeyToS3Key,
      fromStorageKey: mapS3ObjectKeyToUnstorageKey
    }))

    await baseStorage.clear()
  })

  afterEach(async () => {
    if (!isE2EEnabled) return
    if (baseStorage) await baseStorage.clear()
  })

  it.skipIf(!isE2EEnabled)('set with aws-s3 -> get with aws-s3-flex', async () => {
    const key = 'e2e-parity-test'
    const value = { ok: true, t: Date.now() }

    expect(await baseStorage!.hasItem(key)).toBe(false)
    await baseStorage!.setItem(key, value)

    expect(await flexStorage!.hasItem(key)).toBe(true)
    expect(await flexStorage!.getItem(key)).toEqual(value)

    await flexStorage!.removeItem(key)
    expect(await baseStorage!.hasItem(key)).toBe(false)
  })

  it.skipIf(!isE2EEnabled)('set with aws-s3-flex -> get with aws-s3', async () => {
    const key = 'e2e-parity-test-2'
    const value = { msg: 'roundtrip', ts: Date.now() }

    expect(await flexStorage!.hasItem(key)).toBe(false)
    await flexStorage!.setItem(key, value)

    expect(await baseStorage!.hasItem(key)).toBe(true)
    expect(await baseStorage!.getItem(key)).toEqual(value)

    await baseStorage!.removeItem(key)
    expect(await flexStorage!.hasItem(key)).toBe(false)
  })

  // Multi-mount testing
  it.skipIf(!isE2EEnabled)('write to base mount, read from flex mount via unified storage', async () => {
    const key = 'multi-mount-test'
    const value = { source: 'base', target: 'flex', ts: Date.now() }

    // Write through base mount
    await mountedStorage!.setItem(`base:${key}`, value)
    
    // Verify it exists in both mounts (same underlying S3 storage)
    expect(await mountedStorage!.hasItem(`base:${key}`)).toBe(true)
    expect(await mountedStorage!.hasItem(`flex:${key}`)).toBe(true)
    
    // Read through flex mount
    const retrievedValue = await mountedStorage!.getItem(`flex:${key}`)
    expect(retrievedValue).toEqual(value)
    
    // Clean up through either mount
    await mountedStorage!.removeItem(`base:${key}`)
    expect(await mountedStorage!.hasItem(`flex:${key}`)).toBe(false)
  })

  it.skipIf(!isE2EEnabled)('write to flex mount, read from base mount via unified storage', async () => {
    const key = 'multi-mount-test-2'
    const value = { source: 'flex', target: 'base', ts: Date.now() }

    // Write through flex mount
    await mountedStorage!.setItem(`flex:${key}`, value)
    
    // Verify it exists in both mounts (same underlying S3 storage)
    expect(await mountedStorage!.hasItem(`flex:${key}`)).toBe(true)
    expect(await mountedStorage!.hasItem(`base:${key}`)).toBe(true)
    
    // Read through base mount
    const retrievedValue = await mountedStorage!.getItem(`base:${key}`)
    expect(retrievedValue).toEqual(value)
    
    // Clean up through either mount
    await mountedStorage!.removeItem(`flex:${key}`)
    expect(await mountedStorage!.hasItem(`base:${key}`)).toBe(false)
  })
})
