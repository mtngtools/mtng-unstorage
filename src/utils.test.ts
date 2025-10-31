import { describe, it, expect, vi, beforeEach } from 'vitest';
import { serialize, deserialize, validateKey } from './utils.js';

describe('Utils', () => {
  describe('serialize', () => {
    it('should return strings as-is', () => {
      expect(serialize('test')).toBe('test')
    })

    it('should convert primitives to strings', () => {
      expect(serialize(null)).toBe('null')  // String(null) = "null"
      expect(serialize(undefined)).toBe('undefined')  // String(undefined) = "undefined"
      expect(serialize(42)).toBe('42')
      expect(serialize(true)).toBe('true')
      expect(serialize(false)).toBe('false')
    })

    it('should JSON stringify objects', () => {
      const obj = { test: 'value', number: 42 }
      expect(serialize(obj)).toBe(JSON.stringify(obj))
    })

    it('should handle arrays', () => {
      const arr = [1, 2, 3]
      expect(serialize(arr)).toBe(JSON.stringify(arr))
    })

    it('should handle objects with toJSON method', () => {
      // When toJSON returns a string, JSON.stringify will quote it
      const objWithToJSON = {
        value: 'test',
        toJSON() {
          return 'SERIALIZED'
        }
      }
      expect(serialize(objWithToJSON)).toBe('"SERIALIZED"')  // JSON.stringify adds quotes for strings
      
      // Test object with toJSON returning an object
      const objWithObjectToJSON = {
        toJSON() {
          return { serializedObj: 'works' }
        }
      }
      expect(serialize(objWithObjectToJSON)).toBe('{"serializedObj":"works"}')
    })

    it('should throw error for non-serializable objects', () => {
      const circular: any = {}
      circular.self = circular
      expect(() => serialize(circular)).toThrow('[unstorage] Cannot stringify value!')
    })
  })

  describe('deserialize', () => {
    it('should use destr for deserialization', () => {
      // Test various destr behaviors
      expect(deserialize('')).toBe('')
      expect(deserialize('null')).toBe(null)
      expect(deserialize('undefined')).toBe(undefined)
      expect(deserialize('42')).toBe(42)
      expect(deserialize('true')).toBe(true)
      expect(deserialize('false')).toBe(false)
    })

    it('should parse valid JSON objects and arrays', () => {
      expect(deserialize('{"test":"value"}')).toEqual({ test: 'value' })
      expect(deserialize('[1,2,3]')).toEqual([1, 2, 3])
    })

    it('should return string for non-JSON values', () => {
      expect(deserialize('not json')).toBe('not json')
      expect(deserialize('{"invalid": json}')).toBe('{"invalid": json}')
    })

    it('should handle round-trip serialization', () => {
      const testValues = [
        'string',
        42,
        true,
        false,
        null,
        { test: 'value' },
        [1, 2, 3]
      ]
      
      for (const value of testValues) {
        expect(deserialize(serialize(value))).toEqual(value)
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
})