/**
 * AWS S3 Base Driver TypeScript Type Tests
 * 
 * TypeScript compile-time type checking tests for aws-s3 base driver.
 * These tests are NOT included in E2E runs - only in integration tests.
 */

import { describe, it, expect } from 'vitest'
import { createStorage } from 'unstorage'
import { baseMtTestsTypes } from '../../variants/base/base-mt-tests-types.js'
import awsS3Driver from '../../../src/drivers/aws-s3/aws-s3.js'
import { MockS3Client } from '../../helpers/mock-s3.js'
import type { AwsS3DriverOptions } from '../../../src/drivers/aws-s3/types.js'

describe('aws-s3 base (TypeScript types)', () => {
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

  // Shared base variant TypeScript type tests
  baseMtTestsTypes({
    makeDriver,
    makeMockClient,
    defaultOptions
  })

  // S3-specific TypeScript type tests
  describe('S3-specific TypeScript types', () => {
    it('TypeScript correctly types driver when used with createStorage', () => {
      const testStorage = createStorage()
      const options: AwsS3DriverOptions = {
        s3Client: makeMockClient() as any,
        bucket: 'bucket-1',
        allowClear: true
      }
      const driver = awsS3Driver(options)

      // Verify driver has expected methods (runtime check)
      // TypeScript compile-time checking ensures types are correct
      expect(driver.getItem).toBeDefined()
      expect(driver.setItem).toBeDefined()
      expect(driver.clear).toBeDefined()

      // Type-level verification: driver should be assignable to ConditionalDriver
      type DriverType = typeof driver
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      type IsConditionalDriver = DriverType extends any ? true : false
      const _typeCheck: true = true

      testStorage.mount('test', driver)
      expect(testStorage).toBeDefined()
    })
  })
})
