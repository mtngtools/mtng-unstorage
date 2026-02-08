/**
 * AWS Provider Tests
 * 
 * Shared tests for all AWS drivers (S3, DynamoDB, SSM, etc.)
 * Tests provider-level functionality: credentials, region, client construction
 */

import { describe, it, expect } from 'vitest'
import { createStorage } from 'unstorage'
import type { Driver } from 'unstorage'

export interface ProviderTestOptions {
  makeDriver: (opts: any) => Driver
  makeMockClient: () => any
  defaultOptions: any
  /** Option key used to inject the mock client (e.g. 's3Client', 'ssmClient'). Defaults to 's3Client'. */
  clientOptionKey?: string
}

/**
 * AWS provider tests - shared across all AWS drivers
 */
export function awsProviderTests(opts: ProviderTestOptions) {
  const { makeDriver, makeMockClient, defaultOptions, clientOptionKey = 's3Client' } = opts

  describe('AWS provider (credentials, region, client)', () => {
    it('creates driver with valid options via storage interface', () => {
      const storage = createStorage()
      storage.mount('data', makeDriver({ ...defaultOptions, [clientOptionKey]: makeMockClient() }))
      expect(storage).toBeDefined()
    })

    it('constructs internal AWS client when client missing (smoke)', () => {
      // We can't assert constructor calls with mock client, but ensure it doesn't throw
      const smokeStorage = createStorage()
      smokeStorage.mount('smoke', makeDriver({ ...defaultOptions }))
      expect(smokeStorage).toBeDefined()
    })

    it('accepts inline credentials without throwing', () => {
      const credStorage = createStorage()
      credStorage.mount('cred', makeDriver({
        ...defaultOptions,
        region: 'us-east-1',
        accessKeyId: 'AKIA_TEST',
        secretAccessKey: 'SECRET',
        sessionToken: 'TOKEN'
      }))
      expect(credStorage).toBeDefined()
    })

    it('throws if credential pair incomplete', () => {
      expect(() => {
        const errorStorage = createStorage()
        errorStorage.mount('error', makeDriver({ ...defaultOptions, accessKeyId: 'ONLY' }))
      }).toThrow('Both accessKeyId and secretAccessKey are required when providing inline credentials')

      expect(() => {
        const errorStorage2 = createStorage()
        errorStorage2.mount('error2', makeDriver({ ...defaultOptions, secretAccessKey: 'ONLY' }))
      }).toThrow('Both accessKeyId and secretAccessKey are required when providing inline credentials')
    })
  })
}

