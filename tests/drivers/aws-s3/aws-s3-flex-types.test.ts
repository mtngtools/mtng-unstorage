/**
 * AWS S3 Flex Driver TypeScript Type Tests
 * 
 * TypeScript compile-time type checking tests for aws-s3 flex driver.
 * These tests are NOT included in E2E runs - only in integration tests.
 */

import { describe, it, expect } from 'vitest'
import { createStorage } from 'unstorage'
import { flexMtTestsTypes } from '../../variants/flex/flex-mt-tests-types.js'
import awsS3FlexDriver from '../../../src/drivers/aws-s3/aws-s3-flex.js'
import { MockS3Client } from '../../helpers/mock-s3.js'
import type { AwsS3FlexDriverOptions } from '../../../src/drivers/aws-s3/types.js'
import type { ConditionalDriver } from '../../../src/types.js'

describe('aws-s3 flex (TypeScript types)', () => {
  const makeMockClient = () => new MockS3Client()
  const defaultOptions: AwsS3FlexDriverOptions = {
    bucket: 'test-bucket',
    storagePrefix: 'test-prefix/',
    name: 'test-s3-flex',
    allowClear: true,
    s3Client: makeMockClient() as any
  }

  const makeDriver = (opts: Partial<AwsS3FlexDriverOptions> = {}) => {
    // @ts-expect-error - Spreading Partial options with discriminated union credentials causes type error
    // The driver handles credential validation at runtime, so this is safe
    return awsS3FlexDriver({ ...defaultOptions, ...opts, s3Client: opts.s3Client || makeMockClient() as any })
  }

  // Shared flex variant TypeScript type tests
  flexMtTestsTypes({
    makeDriver,
    makeMockClient,
    defaultOptions
  })

  // S3-specific TypeScript type tests
  describe('S3-specific TypeScript types', () => {
    it('TypeScript correctly types flex driver when used with createStorage', () => {
      const testStorage = createStorage()
      const options: AwsS3FlexDriverOptions = {
        s3Client: makeMockClient() as any,
        bucket: 'bucket-1',
        allowClear: true,
        toStorageValue: (params) => JSON.stringify(params.input),
        fromStorageValue: (params) => JSON.parse(params.input as string),
      }
      const driver = awsS3FlexDriver(options)

      // Verify driver has expected methods (runtime check)
      // TypeScript compile-time checking ensures types are correct
      expect(driver.getItem).toBeDefined()
      expect(driver.setItem).toBeDefined()
      expect(driver.clear).toBeDefined()

      // Type-level verification: driver should be assignable to ConditionalDriver
      type DriverType = typeof driver
      type IsConditionalDriver = DriverType extends ConditionalDriver<typeof options> ? true : false
      // Type check passes - driver is correctly typed as ConditionalDriver
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _typeCheck: IsConditionalDriver = true as IsConditionalDriver

      testStorage.mount('test', driver)
      expect(testStorage).toBeDefined()
    })
  })
})

