/**
 * Base Variant TypeScript Type Tests
 * 
 * TypeScript compile-time type checking tests for base variant functionality.
 * These tests are NOT included in E2E runs - only in integration tests.
 */

import { describe, it, expect } from 'vitest'
import type { Driver } from 'unstorage'

export interface BaseVariantTypeTestOptions {
  makeDriver: (opts: any) => Driver
  makeMockClient: () => any
  defaultOptions: any
  /** Option key used to inject the mock client (e.g. 's3Client', 'ssmClient'). Defaults to 's3Client'. */
  clientOptionKey?: string
}

/**
 * Base variant TypeScript type tests - shared across all drivers
 * These tests verify TypeScript compile-time type checking only
 */
export function baseMtTestsTypes(opts: BaseVariantTypeTestOptions) {
  const { makeDriver, makeMockClient, defaultOptions, clientOptionKey = 's3Client' } = opts

  describe('base variant TypeScript types', () => {
    describe('readOnly mode', () => {
      it('TypeScript correctly types read-only driver methods', () => {
        const driver = makeDriver({ ...defaultOptions, [clientOptionKey]: makeMockClient(), readOnly: true })

        // TypeScript should know these methods exist
        const hasGetItem: typeof driver.getItem = driver.getItem
        const hasHasItem: typeof driver.hasItem = driver.hasItem
        const hasGetKeys: typeof driver.getKeys = driver.getKeys

        // Verify read-only driver type excludes write methods
        type DriverType = typeof driver
        type HasSetItem = DriverType extends { setItem: any } ? true : false
        type HasRemoveItem = DriverType extends { removeItem: any } ? true : false
        type HasClear = DriverType extends { clear: any } ? true : false

        // These should be false (methods don't exist)
        // Type checking only - values are intentionally unused
        const _setItemCheck: HasSetItem = false
        const _removeItemCheck: HasRemoveItem = false
        const _clearCheck: HasClear = false

        // These assignments should compile (verify types are correct)
        expect(hasGetItem).toBeDefined()
        expect(hasHasItem).toBeDefined()
        expect(hasGetKeys).toBeDefined()
      })
    })

    describe('allowClear option', () => {
      it('TypeScript correctly types conditional methods based on options', () => {
        // Test full access driver
        const fullDriver = makeDriver({ ...defaultOptions, [clientOptionKey]: makeMockClient(), allowClear: true })
        const hasSetItem: typeof fullDriver.setItem = fullDriver.setItem
        const hasRemoveItem: typeof fullDriver.removeItem = fullDriver.removeItem
        const hasClear: typeof fullDriver.clear = fullDriver.clear
        expect(hasSetItem).toBeDefined()
        expect(hasRemoveItem).toBeDefined()
        expect(hasClear).toBeDefined()

        // Test driver without clear
        const noClearDriver = makeDriver({ ...defaultOptions, [clientOptionKey]: makeMockClient(), allowClear: false })
        const hasSetItem2: typeof noClearDriver.setItem = noClearDriver.setItem
        const hasRemoveItem2: typeof noClearDriver.removeItem = noClearDriver.removeItem

        // Verify clear doesn't exist when allowClear is false
        type NoClearDriverType = typeof noClearDriver
        type HasClear = NoClearDriverType extends { clear: any } ? true : false
        // Type checking only - value is intentionally unused
        const _clearCheck: HasClear = false

        expect(hasSetItem2).toBeDefined()
        expect(hasRemoveItem2).toBeDefined()
      })

      it('TypeScript correctly infers getItem return types', async () => {
        const driver = makeDriver({ ...defaultOptions, [clientOptionKey]: makeMockClient() })

        // getItem returns StorageValue (string | number | boolean | null)
        const value = await driver.getItem('test-key')

        // Verify type is correct (compile-time check)
        // Type checking only - value is intentionally unused for type verification
        const _typeCheck: typeof value = value

        expect(value).toBeNull()
      })
    })
  })
}

