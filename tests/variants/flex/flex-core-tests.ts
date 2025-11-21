/**
 * Flex Variant Core Tests
 * 
 * Core flex functionality tests used in testDriver() via additionalTests parameter.
 * These tests verify custom key/value mapping functionality that is common
 * to all flex drivers regardless of the underlying storage mechanism.
 */

import { describe, it, expect } from 'vitest'
import type { TestContext } from '../../helpers/test-driver.js'

/**
 * Flex core tests - used in testDriver() additionalTests
 * These tests verify flex-specific functionality through the storage interface
 */
export function flexCoreTests(ctx: TestContext) {
  // Note: ctx.storage is set in beforeAll, so we need to access it inside the test functions
  // The describe block is created synchronously, but tests run after beforeAll
  
  describe('flex variant (key/value mapping)', () => {
    // These tests verify that the flex driver works correctly through the storage interface
    // The flex driver may have default or custom mapping functions configured
    // Note: storage from testDriver() doesn't use mount points - keys are used directly
    
    it('applies key/value operations through storage interface', async () => {
      await ctx.storage.setItem('flex-test-key', 'test-value')
      
      // Verify the item can be retrieved
      expect(await ctx.storage.getItem('flex-test-key')).toBe('test-value')
      expect(await ctx.storage.hasItem('flex-test-key')).toBe(true)
    })

    it('lists keys through storage interface', async () => {
      await ctx.storage.setItem('flex-key1', 'value1')
      await ctx.storage.setItem('flex-key2', 'value2')
      
      const keys = await ctx.storage.getKeys()
      const flexKeys = keys.filter(k => k.startsWith('flex-key'))
      expect(flexKeys.sort()).toEqual(['flex-key1', 'flex-key2'].sort())
    })

    it('handles complex key structures', async () => {
      const complexKey = 'flex-user-123-profile'
      const complexData = { user: { id: 123, name: 'John' }, session: { active: true } }
      
      await ctx.storage.setItem(complexKey, complexData)
      expect(await ctx.storage.getItem(complexKey)).toEqual(complexData)
      expect(await ctx.storage.hasItem(complexKey)).toBe(true)
    })

    it('supports hasItem', async () => {
      await ctx.storage.setItem('flex-exists', { data: 'test' })
      
      expect(await ctx.storage.hasItem('flex-exists')).toBe(true)
      expect(await ctx.storage.hasItem('flex-non-existent')).toBe(false)
    })

    it('supports removeItem', async () => {
      await ctx.storage.setItem('flex-to-delete', { temporary: true })
      expect(await ctx.storage.hasItem('flex-to-delete')).toBe(true)
      
      await ctx.storage.removeItem('flex-to-delete')
      expect(await ctx.storage.hasItem('flex-to-delete')).toBe(false)
      expect(await ctx.storage.getItem('flex-to-delete')).toBeNull()
    })

    it('handles complex nested objects', async () => {
      const complexData = {
        user: { id: 123, profile: { name: 'John', settings: { theme: 'dark' } } },
        metadata: { created: '2023-01-01T00:00:00.000Z', tags: ['admin', 'user'] }
      }
      
      await ctx.storage.setItem('flex-complex', complexData)
      const retrieved = await ctx.storage.getItem('flex-complex')
      expect(retrieved).toEqual(complexData)
    })
  })
}

