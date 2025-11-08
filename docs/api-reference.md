# API Reference

## Exported Types

```typescript
// Common types
export type { 
  MTBaseDriverOptions,
  MTBaseDriverRequestOptions,
  ConditionalDriver,
  ReadOnlyDriver,
  WritableDriver,
  WritableDriverWithoutClear,
  BaseDriverMethods
} from './types.js'

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

Creates an S3 storage driver with conditional method availability based on options.

**Parameters:**
- `options: AwsS3DriverOptions` - Configuration options

**Returns:**
- `ConditionalDriver<AwsS3DriverOptions>` - Storage driver instance with conditionally available methods

**Type Safety:**
The return type is conditionally typed based on the provided options:
- If `readOnly: true`: `setItem`, `removeItem`, and `clear` are not available
- If `allowClear: false` or undefined: `clear` is not available (unless readOnly is true)
- TypeScript will error if you try to call unavailable methods

**Example:**
```typescript
// Read-only driver - TypeScript knows write methods are unavailable
const readOnlyDriver = awsS3Driver({ 
  bucket: 'my-bucket', 
  readOnly: true 
});
// ✅ readOnlyDriver.getItem('key') - OK
// ❌ readOnlyDriver.setItem('key', 'value') - TypeScript error: method doesn't exist

// Full access with clear enabled
const fullDriver = awsS3Driver({ 
  bucket: 'my-bucket', 
  allowClear: true 
});
// ✅ fullDriver.clear('base') - OK, method is available
```

## Driver Interface

All drivers implement a conditional interface based on their options. The base interface includes:

```typescript
interface BaseDriverMethods {
  name: string
  flags: { maxDepth: boolean }
  hasItem(key: string, opts?: MTBaseDriverRequestOptions): Promise<boolean>
  getItem<T = unknown>(key: string, opts?: MTBaseDriverRequestOptions): Promise<T | null>
  getKeys(basePrefix: string, opts?: MTBaseDriverRequestOptions): Promise<string[]>
  setItem?: (key: string, value: string, opts?: MTBaseDriverRequestOptions) => Promise<void>
  removeItem?: (key: string, opts?: MTBaseDriverRequestOptions) => Promise<void>
  clear?: (base: string, opts?: MTBaseDriverRequestOptions) => Promise<void>
}
```

**Note:** `setItem`, `removeItem`, and `clear` are conditionally available based on driver options.

### Generic Type Support

The `getItem` method supports generic type parameters for better type safety:

```typescript
// Type inference with generics
const driver = awsS3Driver({ bucket: 'my-bucket' });

// Explicit type
const value = await driver.getItem<string>('my-key');
// value is typed as string | null

// Complex types
const user = await driver.getItem<{ name: string; age: number }>('user:123');
// user is typed as { name: string; age: number } | null
```

## Common Configuration

All drivers support a common set of options via `MTBaseDriverOptions`:

```typescript
interface MTBaseDriverOptions {
  base?: string                 // Base path prefix for all keys
  name?: string                 // Driver name for debugging
  readOnly?: boolean           // Prevent write operations (default: false)
  allowClear?: boolean         // Allow clear operations (default: false)
  maxDepth?: number            // Maximum depth of keys (number of ':' separators)
}
```

## Conditional Driver Types

The package exports several utility types for working with conditional drivers:

### `ConditionalDriver<TOptions>`

Infers the available methods based on driver options:

```typescript
import type { ConditionalDriver, AwsS3DriverOptions } from '@mtngtools/unstorage';

// Read-only driver type
type ReadOnlyS3Driver = ConditionalDriver<{ readOnly: true }>;
// ReadOnlyS3Driver has: hasItem, getItem, getKeys
// ReadOnlyS3Driver does NOT have: setItem, removeItem, clear

// Full access driver type
type FullS3Driver = ConditionalDriver<{ allowClear: true }>;
// FullS3Driver has all methods including clear
```

### `ReadOnlyDriver`

Type alias for a read-only driver (no write methods).

### `WritableDriver`

Type alias for a writable driver with all methods (including clear).

### `WritableDriverWithoutClear`

Type alias for a writable driver without the clear method.

## Request Options

All driver methods accept optional `MTBaseDriverRequestOptions`:

```typescript
interface MTBaseDriverRequestOptions {
  maxDepth?: number  // Maximum depth of keys (number of ':' separators)
}
```