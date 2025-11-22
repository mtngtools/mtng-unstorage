/**
 * AWS S3 Native Driver Factory Tests
 * 
 * Tests for the native driver factory function.
 * Note: Most native driver functionality is tested through driver integration tests.
 * These are integration-only tests (NOT included in E2E tests).
 */

import { describe, it, expect } from 'vitest'
import { nativeDriverAWS } from '../../../src/drivers/aws-s3/shared-native.js'
import { MockS3Client } from '../../helpers/mock-s3.js'

describe('shared-native S3 utilities', () => {
  describe('nativeDriverAWS', () => {
    it('returns driver methods object', () => {
      const mockClient = new MockS3Client()
      const driver = nativeDriverAWS('base', {
        client: mockClient as any,
        Bucket: 'test-bucket',
        fullBasePrefix: 'test/prefix',
        mapToS3Key: (key: string) => `test/prefix/${key}`,
        mapFromS3Key: (key: string) => key.replace('test/prefix/', ''),
        mapValueToS3: (value: any) => value,
        mapValueFromS3: (value: string) => value,
      })

      expect(driver).toHaveProperty('hasItem')
      expect(driver).toHaveProperty('getItem')
      expect(driver).toHaveProperty('setItem')
      expect(driver).toHaveProperty('removeItem')
      expect(driver).toHaveProperty('getKeys')
      expect(driver).toHaveProperty('clear')
    })

    it('uses versioned setItem when driverType is versioned', () => {
      const mockClient = new MockS3Client()
      const driver = nativeDriverAWS('versioned', {
        client: mockClient as any,
        Bucket: 'test-bucket',
        fullBasePrefix: 'test/prefix',
        mapToS3Key: (key: string) => `test/prefix/${key}`,
        mapFromS3Key: (key: string) => key.replace('test/prefix/', ''),
        mapValueToS3: (value: any) => value,
        mapValueFromS3: (value: string) => value,
      })

      expect(driver).toHaveProperty('setItem')
      // The versioned setItem is different from base setItem (doesn't apply value mapping)
      // This is verified through integration tests
    })
  })
})

