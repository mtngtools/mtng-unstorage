/**
 * Base Variant MT Tests
 * 
 * Shared tests for base variant functionality across all drivers
 * Tests: readOnly mode, allowClear option, maxDepth filtering, TypeScript type checking
 */

import { describe, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createStorage } from 'unstorage'
import type { Driver } from 'unstorage'
import { itSkipInE2E } from '../../helpers/test-utils.js'
import { MTTestContext, MTTestOptions } from '../../common/test-driver-config.js'

export interface BaseVariantTestOptions {
  makeDriver: (opts: any) => Driver
  makeMockClient: () => any
  defaultOptions: any
  /** Option key used to inject the mock client (e.g. 's3Client', 'ssmClient'). Defaults to 's3Client'. */
  clientOptionKey?: string
  /** Backend key to set for the readOnly test (e.g. SSM uses '/test-prefix/key1'). Defaults to 'test-prefix/key1'. */
  readOnlySeedKey?: string
}

/**
 * Base variant MT tests - shared across all drivers
 */


export function baseMtTests(testOpts: MTTestOptions) {
  const ctx = testOpts as MTTestContext;

  beforeAll(() => {
    ctx.driver = testOpts.driver;

    ctx.storage = createStorage({
      driver: ctx.driver(testOpts.generateTestDriverOptions?.()),
    });
  });

  afterAll(async () => {
    await ctx.storage?.dispose?.();
  });

  afterEach(async () => {
    await ctx.storage.clear();
  });

  // describe('base variant (readOnly, allowClear)', () => {
  //   describe('readOnly mode', () => {
  //     it('allows read operations via storage interface', async () => {
  //       const mockClient = makeMockClient()
  //       mockClient.storage.set(readOnlySeedKey, 'value')
  //       const readOnlyStorage = createStorage()
  //       readOnlyStorage.mount('readonly', makeDriver({ ...defaultOptions, [clientOptionKey]: mockClient, readOnly: true }))
  //       expect(await readOnlyStorage.getItem('readonly:key1')).toBe('value')
  //       expect(await readOnlyStorage.hasItem('readonly:key1')).toBe(true)
  //       expect(await readOnlyStorage.getKeys('readonly')).toEqual(['readonly:key1'])
  //     })
  //   })

  //   describe('allowClear option', () => {
  //     it('returns clear when allowClear true via storage interface', async () => {
  //       const storage = createStorage()
  //       storage.mount('data', makeDriver({ ...defaultOptions, [clientOptionKey]: makeMockClient(), allowClear: true }))
  //       await expect(storage.clear('data')).resolves.toBeUndefined()
  //     })
  //   })

  describe('maxDepth filtering with mounted storage', () => {
    itSkipInE2E('filters keys by maxDepth when using mounted storage', async () => {
      const storage = createStorage()
      storage.mount('data',
        ctx.driver({
          ...testOpts.generateTestDriverOptions?.(),
          allowClear: true
        }))

      // Set up keys with different depths
      // Note: When using mounted storage, the mount prefix ('data:') adds to the depth
      await storage.setItem('data:depth0', 'v0')
      await storage.setItem('data:depth0:file1', 'v1')
      await storage.setItem('data:depth0:sub1:file2', 'v2')
      await storage.setItem('data:depth0:sub1:sub2:file3', 'v3')
      await storage.setItem('data:depth0:sub1:sub2:sub3:file4', 'v4')

      // Test maxDepth filtering
      // maxDepth: 0 should return 0 keys because 'data:depth0' has depth 1 (mount prefix counts)
      const depth0 = await storage.getKeys('data', { maxDepth: 0 })
      expect(depth0.length).toBe(0)

      // maxDepth: 1 should return 1 key: 'data:depth0'
      const depth1 = await storage.getKeys('data', { maxDepth: 1 })
      expect(depth1.length).toBe(1)
      expect(depth1).toContain('data:depth0')

      // maxDepth: 2 should return 2 keys: 'data:depth0' and 'data:depth0:file1'
      const depth2 = await storage.getKeys('data', { maxDepth: 2 })
      expect(depth2.length).toBe(2)
      expect(depth2).toContain('data:depth0')
      expect(depth2).toContain('data:depth0:file1')

      // No maxDepth should return all keys
      const all = await storage.getKeys('data')
      expect(all.length).toBe(5)
    })
  })

}

// export function baseMtTests(opts: BaseVariantTestOptions) {
//   const { makeDriver, makeMockClient, defaultOptions, clientOptionKey = 's3Client', readOnlySeedKey = 'test-prefix/key1' } = opts




//   })
// }

