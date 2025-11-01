# API Reference

## Exported Types

```typescript
// Common types
export type { MTBaseDriverOptions } from './types.js'

// AWS S3 Driver
export { default as awsS3Driver, toS3StorageKey } from './drivers/aws-s3/aws-s3.js'
export type { AwsS3DriverOptions, S3PutObjectOptions } from './drivers/aws-s3/aws-s3.js'

// Utilities
export { serialize, deserialize, validateKey } from './utils.js'
```

## Utilities

```typescript
import { 
  serialize, 
  deserialize, 
  validateKey,
  toS3StorageKey
} from '@mtng/unstorage'

// Serialize/deserialize values
const serialized = serialize({ test: 'value' })     // '{"test":"value"}'
const deserialized = deserialize(serialized)        // { test: 'value' }

// Validate keys
validateKey('valid-key')     // OK
validateKey('../invalid')    // Throws error

// Get S3 storage key (useful for debugging or custom operations)
const s3Key = toS3StorageKey('user/data', { 
  base: 'app', 
  s3StoragePrefix: 'prod' 
}) // 'prod/app/user/data'
```

## awsS3Driver(options)

Creates an S3 storage driver.

**Parameters:**
- `options: AwsS3DriverOptions` - Configuration options

**Returns:**
- `BaseDriver` - Storage driver instance

## BaseDriver Interface

All drivers implement the following interface:

```typescript
interface BaseDriver {
  name: string
  hasItem(key: string): Promise<boolean>
  getItem(key: string): Promise<any>
  setItem(key: string, value: any): Promise<void>
  removeItem(key: string): Promise<void>
  getKeys(base?: string): Promise<string[]>
  clear(base?: string): Promise<void>
}
```

## Common Configuration

All drivers support a common set of options via `MTBaseDriverOptions`:

```typescript
interface MTBaseDriverOptions {
  base?: string                 // Base path prefix for all keys
  name?: string                 // Driver name for debugging
  readOnly?: boolean           // Prevent write operations (default: false)
  allowClear?: boolean         // Allow clear operations (default: false)
}
```