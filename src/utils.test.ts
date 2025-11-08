import { describe, it, expect } from 'vitest';
import { validateKey, serialize, deserialize } from './utils.js';
import { filterKeyByDepth, streamToString } from './utils.js';

describe('Utils', () => {
  // removed legacy serialize/deserialize tests

  describe('serialize', () => {
    it('JSON stringifies strings and plain objects', () => {
      const obj = { a: 1 }
      expect(serialize('test')).toBe(JSON.stringify('test'))
      expect(serialize(obj)).toBe(JSON.stringify(obj))
    })
  })

  describe('deserialize', () => {
    it('parses JSON strings and passes through non-JSON strings', () => {
      expect(deserialize('{"x":1}')).toEqual({ x: 1 })
      expect(deserialize('[1,2]')).toEqual([1, 2])
      expect(deserialize('not json')).toBe('not json')
    })

    it('returns non-string inputs as-is', () => {
      const obj = { a: 1 }
      expect(deserialize(obj)).toBe(obj)
      expect(deserialize(123 as any)).toBe(123)
      expect(deserialize(true as any)).toBe(true)
      expect(deserialize(null as any)).toBe(null)
      expect(deserialize(undefined as any)).toBe(undefined)
    })
  })

  describe('encode/decode roundtrip', () => {
    it('roundtrips common primitives, arrays, and objects', () => {
      const cases: any[] = [
        'string',
        { a: 1, b: 'two', c: [3, 4] },
        [1, 'two', { three: 3 }],
      ]

      for (const original of cases) {
        const encoded = serialize(original)
        const decoded = deserialize(encoded)
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