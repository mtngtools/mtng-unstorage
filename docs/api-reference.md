# API Reference

## Package Exports

The package supports two import strategies:

1. **Convenience imports** (from main entry) - Everything available in one import
2. **Granular imports** (from subpaths) - Better tree-shaking, recommended for production

### Import Strategies

**Convenience import (from root):**
```typescript
import { 
  awsS3Driver,
  awsS3FlexDriver,
  AwsS3DriverOptions,
  validateKey,
  type MTBaseDriverOptions
} from '@mtngtools/unstorage'
```

**Granular import (from subpaths - recommended for production):**
```typescript
import { awsS3Driver } from '@mtngtools/unstorage/drivers/aws-s3'
import { validateKey } from '@mtngtools/unstorage/utils'
import type { MTBaseDriverOptions } from '@mtngtools/unstorage/types'
```

Both strategies work identically. Use subpath imports for production builds to optimize bundle size.

## Main Entry Point

The main entry (`@mtngtools/unstorage`) exports everything for convenience:

```typescript
// Common types
import type { 
  MTBaseDriverOptions,
  MTBaseDriverRequestOptions,
  ConditionalDriver,
  ReadOnlyDriver,
  WritableDriver,
  WritableDriverWithoutClear,
  BaseDriverMethods
} from '@mtngtools/unstorage'

// Utilities
import { validateKey } from '@mtngtools/unstorage'

// Drivers
import { awsS3Driver, awsS3FlexDriver } from '@mtngtools/unstorage'

// Driver-specific types
import type { AwsS3DriverOptions, S3PutObjectOptions } from '@mtngtools/unstorage'

// Driver helpers
import { toS3StorageKey, normalizeS3Key, joinS3Key } from '@mtngtools/unstorage'
```

## Subpath Exports

Subpath exports provide granular imports for better tree-shaking. All exports are also available from the main entry for convenience.

### Types Subpath

```typescript
// Import all common types
import type { 
  MTBaseDriverOptions,
  ConditionalDriver,
  // ... all common types
} from '@mtngtools/unstorage/types'
```

### Utils Subpath

```typescript
// Import utilities
import { 
  validateKey,
  serialize,
  deserialize,
  streamToString
} from '@mtngtools/unstorage/utils'
```

### AWS S3 Driver Subpath

```typescript
// Import S3 driver, types, and helpers
import { 
  awsS3Driver,
  awsS3FlexDriver,
  type AwsS3DriverOptions,
  type S3PutObjectOptions,
  mapUnstorageKeyToS3Key,
  mapS3ObjectKeyToUnstorageKey,
  toS3StorageKey, // deprecated
  // ... all S3 helpers
} from '@mtngtools/unstorage/drivers/aws-s3'
```

**Note:** All of these exports are also available from the main entry (`@mtngtools/unstorage`) for convenience, but using subpaths provides better tree-shaking in production builds.

## Utilities

```typescript
import { 
  validateKey,
} from '@mtngtools/unstorage/utils'
import { awsS3FlexDriver } from '@mtngtools/unstorage/drivers/aws-s3'

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
import type { ConditionalDriver } from '@mtngtools/unstorage/types';
import type { AwsS3DriverOptions } from '@mtngtools/unstorage/drivers/aws-s3';

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