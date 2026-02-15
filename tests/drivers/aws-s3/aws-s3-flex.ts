/**
 * AWS S3 Flex Driver MT Tests
 * 
 * Driver-specific MT tests for aws-s3 flex driver.
 * These tests are shared between integration and e2e test runs.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest'
import { createStorage } from 'unstorage'
import { mapS3ObjectKeyToUnstorageKey, toS3KeyWithJSONExt } from '../../../src/drivers/aws-s3/shared-public.js'
import { beforeAllSetupCtx, afterAllSetupCtx, afterEachSetupCtx, maybeMakeMockClient, MTTestContext, MTTestOptions, } from '../../common/test-driver-config.js'


export function awsS3FlexDriverMtTests(testOpts: MTTestOptions) {

  describe('S3-specific', () => {
    const ctx = testOpts as MTTestContext;

    beforeAll(() => beforeAllSetupCtx(ctx, testOpts));

    afterAll(async () => { await afterAllSetupCtx(ctx); });

    afterEach(async () => { await afterEachSetupCtx(ctx); });

    describe('custom key mapping via storage interface', () => {
      const ctx2 = testOpts as MTTestContext;

      beforeEach(() => {

        const { clientDriverOptions, mockClient } = maybeMakeMockClient(testOpts);
        ctx2.mockClient = mockClient;

        ctx2.storage = createStorage();


        ctx2.storage.mount('sessions',

          testOpts.driver({
            ...testOpts.generateTestDriverOptions?.(),
            ...clientDriverOptions,
            toStorageKey: (params: any) => {
              const { key, ...rest } = params;
              return toS3KeyWithJSONExt({ ...rest, key: `session-${key}` });
            },
            fromStorageKey: (params: any) => {
              const { key: s3Key, ...rest } = params;
              return mapS3ObjectKeyToUnstorageKey({ ...rest, key: s3Key })
                .replace(/^session-/, '')
                .replace(/\.json$/, '');
            },
          }));
      })

      afterEach(async () => {
        await ctx2.storage?.dispose?.();
      })

      it('applies custom key mapping through storage interface', async () => {
        await ctx2.storage.setItem('sessions:abc123', { token: 'xyz' })

        // Verify custom mapping was applied to S3 key
        expect(ctx2.mockClient.storage.has('session-abc123.json')).toBe(true)
        expect(await ctx2.storage.getItem('sessions:abc123')).toEqual({ token: 'xyz' })
      })

      it('lists keys with custom mapping through storage interface', async () => {
        ctx2.mockClient.storage.set('session-key1.json', JSON.stringify({ data: '1' }))
        ctx2.mockClient.storage.set('session-key2.json', JSON.stringify({ data: '2' }))

        const keys = await ctx2.storage.getKeys('sessions')
        expect(keys.sort()).toEqual(['sessions:key1', 'sessions:key2'])
      })

      it('handles complex key structures with custom mapping', async () => {
        const complexData = { user: { id: 123, name: 'John' }, session: { active: true } }

        await ctx2.storage.setItem('sessions:user:123:profile', complexData)

        // Verify the custom key transformation
        // Custom mapping converts 'sessions:' prefix to 'session-' and appends '.json'
        // With our fix, colons in the key are converted to slashes
        // So 'sessions:user:123:profile' -> 'session-user/123/profile.json'
        expect(ctx2.mockClient.storage.has('session-user/123/profile.json')).toBe(true)
        expect(await ctx2.storage.getItem('sessions:user:123:profile')).toEqual(complexData)
      })

      it('supports hasItem with custom key mapping', async () => {
        await ctx2.storage.setItem('sessions:test-key', { exists: true })

        expect(await ctx2.storage.hasItem('sessions:test-key')).toBe(true)
        expect(await ctx2.storage.hasItem('sessions:non-existent')).toBe(false)

        // Verify underlying storage structure
        expect(ctx2.mockClient.storage.has('session-test-key.json')).toBe(true)
        expect(ctx2.mockClient.storage.has('session-non-existent.json')).toBe(false)
      })

      it('supports removeItem with custom key mapping', async () => {
        await ctx2.storage.setItem('sessions:to-delete', { temporary: true })
        expect(await ctx2.storage.hasItem('sessions:to-delete')).toBe(true)

        await ctx2.storage.removeItem('sessions:to-delete')
        expect(await ctx2.storage.hasItem('sessions:to-delete')).toBe(false)
        expect(ctx2.mockClient.storage.has('session-to-delete.json')).toBe(false)
      })
    })

    describe('custom value mapping via storage interface', () => {
      const ctx2 = testOpts as MTTestContext;

      beforeEach(() => {

        const { clientDriverOptions, mockClient } = maybeMakeMockClient(testOpts);
        ctx2.mockClient = mockClient;

        ctx2.storage = createStorage();


        ctx2.storage.mount('sessions',

          testOpts.driver({
            ...testOpts.generateTestDriverOptions?.(),
            ...clientDriverOptions,
            toStorageValue: (params: any) => {
              const original = JSON.parse(String(params.input))
              const mapped = { _type: 'mapped', payload: original }
              return JSON.stringify(mapped)
            },
            fromStorageValue: ((params: any) => {
              const s3Value = params.input as string;
              const mapped = JSON.parse(s3Value)
              return JSON.stringify(mapped.payload)
            }) as any,
          }));
      })

      afterEach(async () => {
        await ctx2.storage?.dispose?.();
      })

      it('applies custom value mapping through storage interface', async () => {
        const testData = { id: 123, name: 'test' }
        await ctx2.storage.setItem('data:test', testData)

        // Verify custom value serialization
        expect(ctx2.mockClient.storage.get('test')).toBe(JSON.stringify({ _type: 'mapped', payload: testData }))
        expect(await ctx2.storage.getItem('data:test')).toEqual(testData)
      })

      it('handles complex nested objects with custom mapping', async () => {
        const complexData = {
          user: { id: 123, profile: { name: 'John', settings: { theme: 'dark' } } },
          metadata: { created: '2023-01-01T00:00:00.000Z', tags: ['admin', 'user'] }
        }

        await ctx2.storage.setItem('data:complex', complexData)

        const retrieved = await ctx2.storage.getItem('data:complex')
        expect(retrieved).toEqual(complexData)

        // Verify custom serialization format
        const stored = ctx2.mockClient.storage.get('complex')
        expect(stored).toContain('"_type":"mapped"')
        expect(stored).toContain('"name":"John"')
      })
    })
  })

}
