/**
 * Common Storage Utilities Tests
 * 
 * Tests for storage-specific common utilities (validateKey, etc.).
 * These are integration-only tests (NOT included in E2E tests).
 */

import { describe, it, expect } from 'vitest'
import { validateKey } from '../../src/utils/common-storage.js'

describe('common-storage utilities', () => {
  describe('validateKey', () => {
    it('should accept valid keys', () => {
      expect(() => validateKey('valid')).not.toThrow()
      expect(() => validateKey('path/to/key')).not.toThrow()
      expect(() => validateKey('key-with-dashes_and_underscores')).not.toThrow()
    })

    it('should reject empty or non-string keys', () => {
      expect(() => validateKey('')).toThrow('Key must be a non-empty string')
      expect(() => validateKey(null as any)).toThrow('Key must be a non-empty string')
      expect(() => validateKey(undefined as any)).toThrow('Key must be a non-empty string')
      expect(() => validateKey(42 as any)).toThrow('Key must be a non-empty string')
    })

    it('should reject keys with path traversal', () => {
      expect(() => validateKey('path/../other')).toThrow('Key cannot contain ".." path segments')
      expect(() => validateKey('../key')).toThrow('Key cannot contain ".." path segments')
      expect(() => validateKey('key/..')).toThrow('Key cannot contain ".." path segments')
    })
  })
})

