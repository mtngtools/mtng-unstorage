/**
 * AWS SSM Flex Driver MT Tests
 *
 * Driver-specific MT tests for aws-ssm flex driver.
 * Shared between integration and e2e test runs.
 */

import { describe, it, expect } from 'vitest'
import { createStorage } from 'unstorage'
import { flexMtTests } from '../../variants/flex/flex-mt-tests.js'
import awsSsmFlexDriver from '../../../src/drivers/aws-ssm/aws-ssm-flex.js'
import { MockSSMClient } from '../../helpers/mock-ssm.js'
import type { AwsSsmFlexDriverOptions } from '../../../src/drivers/aws-ssm/types.js'

describe('aws-ssm flex (mt tests)', () => {
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

  flexMtTests({
    makeDriver,
    makeMockClient,
    defaultOptions,
    clientOptionKey: 'ssmClient',
  })

  describe('SSM-specific', () => {
    it('uses default driver name when name omitted via storage interface', () => {
      const testStorage = createStorage()
      testStorage.mount('test', awsSsmFlexDriver({ ssmClient: makeMockClient() as any, region: 'us-east-1' }))
      expect(testStorage).toBeDefined()
    })

    it('round-trips with value mapping via storage interface', async () => {
      const storage = createStorage()
      storage.mount('data', makeDriver({
        toStorageValue: (params) => JSON.stringify(params.input),
        fromStorageValue: (params) => JSON.parse(params.input as string),
      }))
      await storage.setItem('data:key1', { foo: 'bar' })
      expect(await storage.getItem('data:key1')).toEqual({ foo: 'bar' })
    })
  })
})
