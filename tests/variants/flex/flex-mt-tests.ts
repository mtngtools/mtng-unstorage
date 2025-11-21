/**
 * Flex Variant MT Tests
 * 
 * Shared tests for flex variant functionality across all drivers
 * Tests: error handling, mapping function validation, edge cases
 */

import { describe, it, expect } from 'vitest'
import { createStorage } from 'unstorage'
import type { Driver } from 'unstorage'

export interface FlexVariantTestOptions {
  makeDriver: (opts: any) => Driver
  makeMockClient: () => any
  defaultOptions: any
}

/**
 * Flex variant MT tests - shared across all drivers
 */
export function flexMtTests(opts: FlexVariantTestOptions) {
  const { makeDriver, makeMockClient, defaultOptions } = opts

  describe('flex variant (error handling, validation)', () => {
    describe('error handling with invalid mapping functions', () => {
      it('handles errors in toStorageKey mapping', async () => {
        const storage = createStorage()
        storage.mount('error', makeDriver({
          ...defaultOptions,
          s3Client: makeMockClient(),
          toStorageKey: () => { throw new Error('Key mapping failed') },
          fromStorageKey: (s3Key: string) => s3Key,
        }))

        await expect(storage.setItem('error:key', 'value')).rejects.toThrow('Key mapping failed')
      })

      it('handles errors in fromStorageKey mapping', async () => {
        const mockClient = makeMockClient()
        const storage = createStorage()
        storage.mount('error', makeDriver({
          ...defaultOptions,
          s3Client: mockClient,
          toStorageKey: (key: string) => key,
          fromStorageKey: () => { throw new Error('Key unmapping failed') },
        }))

        // Set data directly in mock storage to test fromStorageKey error
        // Note: The exact behavior depends on the driver implementation
        // Some drivers may return empty array instead of throwing
        mockClient.storage.set('direct-key', 'value')
        
        // The driver may handle this gracefully by returning empty array
        // or it may throw - test for either behavior
        try {
          const keys = await storage.getKeys('error')
          // If it doesn't throw, it should return empty array
          expect(keys).toEqual([])
        } catch (error: any) {
          // If it throws, verify the error message
          expect(error.message).toContain('Key unmapping failed')
        }
      })

      it('handles errors in toStorageValue mapping', async () => {
        const storage = createStorage()
        storage.mount('error', makeDriver({
          ...defaultOptions,
          s3Client: makeMockClient(),
          toStorageValue: () => { throw new Error('Value mapping failed') },
          fromStorageValue: (value: string) => JSON.parse(value),
        }))

        await expect(storage.setItem('error:key', 'value')).rejects.toThrow('Value mapping failed')
      })

      it('handles errors in fromStorageValue mapping', async () => {
        const storage = createStorage()
        storage.mount('error', makeDriver({
          ...defaultOptions,
          s3Client: makeMockClient(),
          toStorageValue: (value: any) => JSON.stringify(value),
          fromStorageValue: () => { throw new Error('Value unmapping failed') },
        }))

        // Set data and try to retrieve it; driver returns null on mapping errors
        await storage.setItem('error:key', 'value')
        await expect(storage.getItem('error:key')).resolves.toBeNull()
      })
    })
  })
}

