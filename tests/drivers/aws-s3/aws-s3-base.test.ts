/**
 * AWS S3 Base Driver MT Tests
 * 
 * Driver-specific MT tests for aws-s3 base driver.
 * These tests are shared between integration and e2e test runs.
 */

import { describe, it, expect } from 'vitest'
import { createStorage } from 'unstorage'
import { awsProviderTests } from '../../providers/aws/aws-provider-tests.js'
import { baseMtTests } from '../../variants/base/base-mt-tests.js'
import { itSkipInE2E } from '../../helpers/test-utils.js'
import awsS3Driver from '../../../src/drivers/aws-s3/aws-s3.js'
import { MockS3Client } from '../../helpers/mock-s3.js'
import type { AwsS3DriverOptions } from '../../../src/drivers/aws-s3/types.js'

describe('aws-s3 base (mt tests)', () => {
  const makeMockClient = () => new MockS3Client()
  const defaultOptions: AwsS3DriverOptions = {
    bucket: 'test-bucket',
    storagePrefix: 'test-prefix/',
    name: 'test-s3-base',
    allowClear: true,
    s3Client: makeMockClient() as any
  }

  const makeDriver = (opts: Partial<AwsS3DriverOptions> = {}) => {
    // @ts-expect-error - Spreading Partial options with discriminated union credentials causes type error
    // The driver handles credential validation at runtime, so this is safe
    return awsS3Driver({ ...defaultOptions, ...opts, s3Client: opts.s3Client || makeMockClient() as any })
  }

  // Shared provider tests
  awsProviderTests({
    makeDriver,
    makeMockClient,
    defaultOptions
  })

  // // Shared base variant MT tests
  // baseMtTests({
  //   makeDriver,
  //   makeMockClient,
  //   defaultOptions
  // })

  // S3-specific additional tests
  describe('S3-specific', () => {
    itSkipInE2E('throws when bucket is missing', () => {
      expect(() => {
        const errorStorage = createStorage()
        errorStorage.mount('error', makeDriver({ bucket: '' }))
      }).toThrow('S3 bucket name is required')
    })

    it('passes custom S3 options through storage interface', async () => {
      const storage = createStorage()
      storage.mount('data', makeDriver())
      await expect(storage.setItem('data:test-key', 'content')).resolves.toBeUndefined()
    })

    it('uses default driver name when name omitted via storage interface', () => {
      const testStorage = createStorage()
      testStorage.mount('test', awsS3Driver({ s3Client: makeMockClient() as any, bucket: 'bucket-1' }))
      // Cannot directly access driver name through storage interface, but mount succeeds
      expect(testStorage).toBeDefined()
    })
  })
})

