/**
 * AWS SSM Base Driver MT Tests
 *
 * Driver-specific MT tests for aws-ssm base driver (base variant only).
 * Shared between integration and e2e test runs.
 */

import { describe, it, expect } from 'vitest'
import { createStorage } from 'unstorage'
import { awsProviderTests } from '../../providers/aws/aws-provider-tests.js'
import { baseMtTests } from '../../variants/base/base-mt-tests.js'
import awsSsmDriver from '../../../src/drivers/aws-ssm/aws-ssm.js'
import { MockSSMClient } from '../../helpers/mock-ssm.js'
import type { AwsSsmDriverOptions } from '../../../src/drivers/aws-ssm/types.js'

describe('aws-ssm base (mt tests)', () => {
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

  awsProviderTests({
    makeDriver,
    makeMockClient,
    defaultOptions,
    clientOptionKey: 'ssmClient',
  })

  baseMtTests({
    makeDriver,
    makeMockClient,
    defaultOptions,
    clientOptionKey: 'ssmClient',
    readOnlySeedKey: '/test-prefix/key1',
  })

  describe('SSM-specific', () => {
    it('throws when region is missing', () => {
      expect(() => {
        const storage = createStorage()
        storage.mount('err', awsSsmDriver({ ssmClient: makeMockClient() as any, region: '' }))
      }).toThrow('AWS region is required')
    })

    it('round-trips via storage interface', async () => {
      const storage = createStorage()
      storage.mount('data', makeDriver())
      await storage.setItem('data:my-key', 'my-value')
      expect(await storage.getItem('data:my-key')).toBe('my-value')
    })

    it('clear throws when fullBasePrefix is empty (no storagePrefix or base)', async () => {
      const storage = createStorage()
      storage.mount('data', awsSsmDriver({
        region: 'us-east-1',
        ssmClient: makeMockClient() as any,
        allowClear: true,
        storagePrefix: '',
        base: '',
      }))
      await expect(storage.clear('data')).rejects.toThrow('clear is not allowed')
    })
  })
})
