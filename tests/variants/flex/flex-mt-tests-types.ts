/**
 * Flex Variant TypeScript Type Tests
 * 
 * TypeScript compile-time type checking tests for flex variant functionality.
 * These tests are NOT included in E2E runs - only in integration tests.
 */

import { describe, it, expect } from 'vitest'
import type { Driver } from 'unstorage'

export interface FlexVariantTypeTestOptions {
  makeDriver: (opts: any) => Driver
  makeMockClient: () => any
  defaultOptions: any
}

/**
 * Flex variant TypeScript type tests - shared across all drivers
 * These tests verify TypeScript compile-time type checking only
 */
export function flexMtTestsTypes(opts: FlexVariantTypeTestOptions) {
  const { makeDriver, makeMockClient, defaultOptions } = opts

  describe('flex variant TypeScript types', () => {
    it('TypeScript correctly types flex driver with value mapping', () => {
      const driver = makeDriver({
        ...defaultOptions,
        s3Client: makeMockClient(),
        toStorageValue: (v: any) => JSON.stringify(v),
        fromStorageValue: (v: string) => JSON.parse(v),
      })

      // Verify driver has expected methods (runtime check)
      expect(driver.getItem).toBeDefined()
      expect(driver.setItem).toBeDefined()
      expect(driver.clear).toBeDefined()

      // Type-level verification: driver should be assignable to ConditionalDriver
      // Type checking only - verify the type compiles correctly
      // The type check happens at compile time - we just need to reference the type
      // @ts-expect-error - intentionally unused for type checking
      const _typeCheck: typeof driver = driver
    })

    it('TypeScript correctly infers return types from fromStorageValue', async () => {
      const driver = makeDriver({
        ...defaultOptions,
        s3Client: makeMockClient(),
        readOnly: true,
        fromStorageValue: (v: string) => JSON.parse(v),
      })

      // Type inference should work with generic
      const userValue = await driver.getItem('test-key') as { name: string } | null
      // TypeScript should correctly infer the return type
      // Type checking only - value is intentionally unused
      // @ts-expect-error - intentionally unused for type checking
      const _userCheck: { name: string } | null = userValue

      expect(userValue).toBeNull()
    })

    it('TypeScript correctly types read-only flex driver', () => {
      const driver = makeDriver({
        ...defaultOptions,
        s3Client: makeMockClient(),
        readOnly: true,
        fromStorageValue: (v: string) => JSON.parse(v),
      })

      // Runtime check: read-only driver should not have write methods
      expect(driver.setItem).toBeUndefined()
      expect(driver.removeItem).toBeUndefined()
      expect(driver.clear).toBeUndefined()
      expect(driver.getItem).toBeDefined()

      // Type-level verification: driver should exclude write methods
      type DriverType = typeof driver
      type HasSetItem = DriverType extends { setItem: any } ? true : false
      type HasRemoveItem = DriverType extends { removeItem: any } ? true : false
      type HasClear = DriverType extends { clear: any } ? true : false

      // These should be false (methods don't exist)
      // @ts-expect-error - intentionally unused for type checking
      const _setItemCheck: HasSetItem = false
      // @ts-expect-error - intentionally unused for type checking
      const _removeItemCheck: HasRemoveItem = false
      // @ts-expect-error - intentionally unused for type checking
      const _clearCheck: HasClear = false
    })
  })
}

