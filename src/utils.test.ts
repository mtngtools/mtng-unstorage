import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateKey, encodeValueToJSONIfObject, decodeJSONIfApplicable } from './utils.js';
import { filterKeyByDepth, checkReadOnly, streamToString } from './utils.js';

describe('Utils', () => {
  // removed legacy serialize/deserialize tests

  describe('encodeValueToJSONIfObject', () => {
    it('encodes primitives via String()', () => {
      expect(encodeValueToJSONIfObject('test')).toBe('test')
      expect(encodeValueToJSONIfObject(null)).toBe('null')
      expect(encodeValueToJSONIfObject(undefined)).toBe('undefined')
      expect(encodeValueToJSONIfObject(42)).toBe('42')
      expect(encodeValueToJSONIfObject(true)).toBe('true')
      expect(encodeValueToJSONIfObject(false)).toBe('false')
    })

    it('JSON stringifies objects and arrays', () => {
      const obj = { a: 1 }
      const arr = [1, 2, 3]
      expect(encodeValueToJSONIfObject(obj)).toBe(JSON.stringify(obj))
      expect(encodeValueToJSONIfObject(arr)).toBe(JSON.stringify(arr))
    })

    it('respects custom toJSON implementations', () => {
      const v1 = { toJSON: () => 'SER' }
      const v2 = { toJSON: () => ({ x: 1 }) }
      expect(encodeValueToJSONIfObject(v1)).toBe('SER')
      expect(encodeValueToJSONIfObject(v2)).toBe(JSON.stringify({ x: 1 }))
    })
  })

  describe('decodeJSONIfApplicable', () => {
    it('parses JSON strings and passes through non-JSON strings', () => {
      expect(decodeJSONIfApplicable('{"x":1}')).toEqual({ x: 1 })
      expect(decodeJSONIfApplicable('[1,2]')).toEqual([1, 2])
      expect(decodeJSONIfApplicable('not json')).toBe('not json')
    })

    it('returns non-string inputs as-is', () => {
      const obj = { a: 1 }
      expect(decodeJSONIfApplicable(obj)).toBe(obj)
      expect(decodeJSONIfApplicable(123 as any)).toBe(123)
      expect(decodeJSONIfApplicable(true as any)).toBe(true)
      expect(decodeJSONIfApplicable(null as any)).toBe(null)
      expect(decodeJSONIfApplicable(undefined as any)).toBe(undefined)
    })
  })

  describe('encode/decode roundtrip', () => {
    it('roundtrips common primitives, arrays, and objects', () => {
      const cases: any[] = [
        'string',
        123,
        true,
        false,
        null,
        undefined,
        { a: 1, b: 'two', c: [3, 4] },
        [1, 'two', { three: 3 }],
      ]

      for (const original of cases) {
        const encoded = encodeValueToJSONIfObject(original)
        const decoded = decodeJSONIfApplicable(encoded)
        expect(decoded).toEqual(original)
      }
    })
  })

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

  describe('filterKeyByDepth', () => {
    it('should allow any key when maxDepth is undefined', () => {
      expect(filterKeyByDepth('a:b:c', undefined)).toBe(true)
    })

    it('should correctly count depth using ":" separators', () => {
      expect(filterKeyByDepth('top', 0)).toBe(true)
      expect(filterKeyByDepth('top:child', 0)).toBe(false)
      expect(filterKeyByDepth('top:child', 1)).toBe(true)
      expect(filterKeyByDepth('a:b:c:d', 2)).toBe(false)
      expect(filterKeyByDepth('a:b:c', 2)).toBe(true)
    })
  })

  describe('checkReadOnly', () => {
    it('should throw when readOnly is true', () => {
      expect(() => checkReadOnly(true, 'setItem')).toThrow('Cannot perform setItem: driver is in read-only mode')
    })

    it('should not throw when readOnly is false', () => {
      expect(() => checkReadOnly(false, 'setItem')).not.toThrow()
    })
  })

  describe('streamToString', () => {
    it('should return string as-is', async () => {
      expect(await streamToString('plain')).toBe('plain')
    })

    it('should use transformToString when available', async () => {
      const obj: any = { transformToString: async () => 'from-transform' }
      expect(await streamToString(obj)).toBe('from-transform')
    })

    it('should convert a Node.js Readable stream to string', async () => {
      const { Readable } = await import('stream')
      const s = new Readable()
      s.push('chunk-1')
      s.push('chunk-2')
      s.push(null)
      const res = await streamToString(s)
      expect(res).toBe('chunk-1chunk-2')
    })
  })
})