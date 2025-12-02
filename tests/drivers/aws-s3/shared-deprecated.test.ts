/**
 * AWS S3 Deprecated Utilities Tests
 * 
 * Tests for deprecated S3 utilities (backward compatibility).
 * These are integration-only tests (NOT included in E2E tests).
 */

import { describe, it, expect } from 'vitest'
import { toS3StorageKey } from '../../../src/drivers/aws-s3/shared-deprecated.js'
import { mapUnstorageKeyToS3Key } from '../../../src/drivers/aws-s3/shared-public.js'

function makeResolved(overrides: Record<string, any> = {}) {
  const opts = { bucket: 'b', ...overrides }
  return { fullBasePrefix: 'test/prefix', ...opts }
}

describe('shared-deprecated S3 utilities', () => {
  describe('toS3StorageKey (deprecated alias)', () => {
    const resolved = makeResolved()

    it('behaves the same as mapUnstorageKeyToS3Key', () => {
      expect(toS3StorageKey({ key: 'k', resolvedDriverOptions: resolved })).toBe(mapUnstorageKeyToS3Key({ key: 'k', resolvedDriverOptions: resolved }))
      expect(toS3StorageKey({ key: 'user:data', resolvedDriverOptions: resolved })).toBe(mapUnstorageKeyToS3Key({ key: 'user:data', resolvedDriverOptions: resolved }))
    })
  })
})

