import { describe, it, expect } from 'vitest';
import { MockS3Client } from '../../../tests/helpers/mock-s3.js';
import awsS3FlexDriver from './aws-s3-flex.js';
import awsS3Driver from './aws-s3.js';
import { createStorage } from 'unstorage';
import { mapUnstorageKeyToS3Key } from './shared.js';

// NOTE: Common driver contract tests for flex are now covered in
// aws-s3-common.test.ts. This file is intentionally limited to 
// scenarios unique to the flex driver.

describe('aws-s3-flex flex only scenarios', () => {

  it('custom mapper replaces middle section with "replaced" and is consistent', async () => {
    const bucket = 'test-bucket'

    // Custom mapping: collapse everything between the first and last segment
    // into a single literal 'replaced'
    const toStorageKey = (key: string, opts: any) => {
      const parts = key.split(':')
      if (parts.length <= 2) return mapUnstorageKeyToS3Key(key, opts)
      const mappedKey = `${parts[0]}:replaced:${parts[parts.length - 1]}`
      // Convert colons to slashes to match base driver behavior
      return mapUnstorageKeyToS3Key(mappedKey, opts)
    }

    const fromStorageKey = (s3Key: string, _opts: any) => {
      // Map S3 key back to the original long consumer-visible key by
      // restoring the known middle section used by our test fixture.
      const parts = s3Key.split(':')
      if (parts.length <= 2) return s3Key
      const middle = 'long:section:that:is:always:the:same'
      return `${parts[0]}:${middle}:${parts[parts.length - 1]}`
    }

    const mockClient = new MockS3Client()

    const baseStorage = createStorage({
      driver: awsS3Driver({
        s3Client: (mockClient as any),
        bucket,
        s3StoragePrefix: '',
        base: '',
        name: 'aws-s3-base',
        allowClear: true
      })
    })

    const flexStorage = createStorage({
      driver: awsS3FlexDriver({
        s3Client: (mockClient as any),
        bucket,
        s3StoragePrefix: '',
        base: '',
        name: 'aws-s3-flex',
        allowClear: true,
        toStorageKey,
        fromStorageKey
      })
    })

    await baseStorage.clear();
    await flexStorage.clear();
    (mockClient as any).storage.clear()

    const originalKey = 'part1:long:section:that:is:always:the:same:part2'
    const reducedKey = 'part1:replaced:part2'
    const value = { foo: 'bar' }

    await flexStorage.setItem(originalKey, value)

    expect(await baseStorage.hasItem(reducedKey)).toBe(true)
    expect(await baseStorage.getItem(reducedKey)).toEqual(value)

    expect(await flexStorage.getItem(originalKey)).toEqual(value)

    await flexStorage.removeItem(originalKey)
    expect(await baseStorage.hasItem(reducedKey)).toBe(false)
  })

  it('custom mapper works with a different begin/end tokens (alpha/omega)', async () => {
    const bucket = 'test-bucket'

    const toStorageKey = (key: string, opts: any) => {
      const parts = key.split(':')
      if (parts.length <= 2) return mapUnstorageKeyToS3Key(key, opts)
      const mappedKey = `${parts[0]}:replaced:${parts[parts.length - 1]}`;
      // Convert colons to slashes to match base driver behavior
      return mapUnstorageKeyToS3Key(mappedKey, opts)
    }

    const fromStorageKey = (s3Key: string, _opts: any) => {
      const parts = s3Key.split(':')
      if (parts.length <= 2) return s3Key
      const middle = 'long:section:that:is:always:the:same'
      return `${parts[0]}:${middle}:${parts[parts.length - 1]}`
    }

    const mockClient = new MockS3Client()

    const baseStorage = createStorage({
      driver: awsS3Driver({
        s3Client: (mockClient as any),
        bucket,
        s3StoragePrefix: '',
        base: '',
        name: 'aws-s3-base',
        allowClear: true
      })
    })

    const flexStorage = createStorage({
      driver: awsS3FlexDriver({
        s3Client: (mockClient as any),
        bucket,
        s3StoragePrefix: '',
        base: '',
        name: 'aws-s3-flex',
        allowClear: true,
        toStorageKey,
        fromStorageKey
      })
    })

    await baseStorage.clear();
    await flexStorage.clear();
    (mockClient as any).storage.clear()

    const originalKey = 'alpha:long:section:that:is:always:the:same:omega'
    const reducedKey = 'alpha:replaced:omega'
    const value = { baz: 'qux' }

    await flexStorage.setItem(originalKey, value)

    expect(await baseStorage.hasItem(reducedKey)).toBe(true)
    expect(await baseStorage.getItem(reducedKey)).toEqual(value)

    expect(await flexStorage.getItem(originalKey)).toEqual(value)

    await flexStorage.removeItem(originalKey)
    expect(await baseStorage.hasItem(reducedKey)).toBe(false)
  })

  it('custom value mapping parses JSON from raw S3 into typed object and stringifies on write', async () => {
    const bucket = 'test-bucket'

    const mockClient = new MockS3Client()

    const toStorageKey = (key: string) => key
    const fromStorageKey = (key: string) => key

    type User = { id: string; name: string }

    // Value mappers operate on raw strings
    const toStorageValue = (value: string) => {
      // Ensure value is valid JSON string (pass-through here)
      return value
    }
    const fromStorageValue = <T = unknown>(value: string): T => {
      try {
        return JSON.parse(value) as T
      } catch {
        return value as unknown as T
      }
    }

    const flexStorage = createStorage({
      driver: awsS3FlexDriver({
        s3Client: (mockClient as any),
        bucket,
        s3StoragePrefix: '',
        base: '',
        name: 'aws-s3-flex',
        allowClear: true,
        toStorageKey,
        fromStorageKey,
        toStorageValue,
        fromStorageValue,
      })
    })

    await flexStorage.clear();
    (mockClient as any).storage.clear()

    const key = 'users:1'
    const user: User = { id: '1', name: 'Ada' }

    // set via storage (storage layer serializes to JSON string before driver)
    await flexStorage.setItem(key, user)

    // underlying storage should store a JSON string
    const storedRaw = (mockClient as any).storage.get('users:1')
    expect(typeof storedRaw).toBe('string')
    expect(() => JSON.parse(storedRaw)).not.toThrow()

    // get should return typed object using fromStorageValue
    const got = await flexStorage.getItem(key) as User
    expect(got).toEqual(user)
  })

});