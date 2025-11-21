/**
 * Common Library Utilities Tests
 * 
 * Tests for common library utilities (serialize, deserialize, streamToString).
 * These are integration-only tests (NOT included in E2E tests).
 */

import { describe, it, expect } from 'vitest'
import { serialize, deserialize, streamToString } from '../../src/utils/common-lib.js'

describe('common-lib utilities', () => {
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

