# API Reference

## Exported Types

```typescript
// Common types
export type { MTBaseDriverOptions } from './types.js'

// AWS S3 Drivers
// Root export exposes the base S3 driver
export { default as awsS3Driver } from './drivers/aws-s3/aws-s3.js'
export type { AwsS3DriverOptions, S3PutObjectOptions } from './drivers/aws-s3/aws-s3.js'
// Subpath export exposes the flex S3 driver with custom mapping hooks
// import awsS3FlexDriver from '@mtngtools/unstorage/aws-s3-flex'

// Utilities
export { validateKey } from './utils.js'
```

## Utilities

```typescript
import { 
  validateKey,
} from '@mtng/unstorage'
import awsS3FlexDriver from '@mtngtools/unstorage/aws-s3-flex'

// Validate keys
validateKey('valid-key')     // OK
validateKey('../invalid')    // Throws error

// Flex driver (custom mapping)
const flex = createStorage({
  driver: awsS3FlexDriver({ bucket: 'b', toStorageKey: (k, opts) => `${opts.fullBasePrefix}/${k}.json`, fromStorageKey: (s, opts) => s })
})
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