/**
 * AWS SSM Flex Driver TypeScript Type Tests
 *
 * TypeScript compile-time type checking tests for aws-ssm flex driver.
 * Not included in E2E runs - only in integration tests.
 */

import { describe, it, expect } from 'vitest'
import { createStorage } from 'unstorage'
import { flexMtTestsTypes } from '../../variants/flex/flex-mt-tests-types.js'
import awsSsmFlexDriver from '../../../src/drivers/aws-ssm/aws-ssm-flex.js'
import { MockSSMClient } from '../../helpers/mock-ssm.js'
import type { AwsSsmFlexDriverOptions } from '../../../src/drivers/aws-ssm/types.js'
import type { ConditionalDriver } from '../../../src/types.js'

describe('aws-ssm flex (TypeScript types)', () => {
  const makeMockClient = () => new MockSSMClient()
  const defaultOptions: AwsSsmFlexDriverOptions = {
    region: 'us-east-1',
    storagePrefix: 'test-prefix',
    name: 'test-ssm-flex',
    allowClear: true,
    ssmClient: makeMockClient() as any,
  }

  const makeDriver = (opts: Partial<AwsSsmFlexDriverOptions> = {}) => {
    // @ts-expect-error - Spreading Partial options with discriminated union credentials causes type error
    return awsSsmFlexDriver({
      ...defaultOptions,
      ...opts,
      ssmClient: opts.ssmClient ?? makeMockClient() as any,
    })
  }

  flexMtTestsTypes({
    makeDriver,
    makeMockClient,
    defaultOptions,
    clientOptionKey: 'ssmClient',
  })

  describe('SSM-specific TypeScript types', () => {
    it('TypeScript correctly types flex driver when used with createStorage', () => {
      const testStorage = createStorage()
      const options: AwsSsmFlexDriverOptions = {
        ssmClient: makeMockClient() as any,
        region: 'us-east-1',
        allowClear: true,
        toStorageValue: (params) => JSON.stringify(params.input),
        fromStorageValue: (params) => JSON.parse(params.input as string),
      }
      const driver = awsSsmFlexDriver(options)

      expect(driver.getItem).toBeDefined()
      expect(driver.setItem).toBeDefined()
      expect(driver.clear).toBeDefined()

      type DriverType = typeof driver
      type IsConditionalDriver = DriverType extends ConditionalDriver<typeof options> ? true : false
      const _typeCheck: IsConditionalDriver = true as IsConditionalDriver

      testStorage.mount('test', driver)
      expect(testStorage).toBeDefined()
    })
  })
})
