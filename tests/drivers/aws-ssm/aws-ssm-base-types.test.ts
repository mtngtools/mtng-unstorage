/**
 * AWS SSM Base Driver TypeScript Type Tests
 *
 * TypeScript compile-time type checking tests for aws-ssm base driver.
 * Not included in E2E runs - only in integration tests.
 */

import { describe, it, expect } from 'vitest'
import { createStorage } from 'unstorage'
import { baseMtTestsTypes } from '../../variants/base/base-mt-tests-types.js'
import awsSsmDriver from '../../../src/drivers/aws-ssm/aws-ssm.js'
import { MockSSMClient } from '../../helpers/mock-ssm.js'
import type { AwsSsmDriverOptions } from '../../../src/drivers/aws-ssm/types.js'

describe('aws-ssm base (TypeScript types)', () => {
  const makeMockClient = () => new MockSSMClient()
  const defaultOptions: AwsSsmDriverOptions = {
    region: 'us-east-1',
    storagePrefix: 'test-prefix',
    name: 'test-ssm-base',
    allowClear: true,
    ssmClient: makeMockClient() as any,
  }

  const makeDriver = (opts: Partial<AwsSsmDriverOptions> = {}) => {
    // @ts-expect-error - Spreading Partial options with discriminated union credentials causes type error
    return awsSsmDriver({
      ...defaultOptions,
      ...opts,
      ssmClient: opts.ssmClient ?? makeMockClient() as any,
    })
  }

  baseMtTestsTypes({
    makeDriver,
    makeMockClient,
    defaultOptions,
    clientOptionKey: 'ssmClient',
  })

  describe('SSM-specific TypeScript types', () => {
    it('TypeScript correctly types driver when used with createStorage', () => {
      const testStorage = createStorage()
      const options: AwsSsmDriverOptions = {
        region: 'us-east-1',
        ssmClient: makeMockClient() as any,
        allowClear: true,
      }
      const driver = awsSsmDriver(options)

      expect(driver.getItem).toBeDefined()
      expect(driver.setItem).toBeDefined()
      expect(driver.clear).toBeDefined()

      testStorage.mount('test', driver)
      expect(testStorage).toBeDefined()
    })
  })
})
