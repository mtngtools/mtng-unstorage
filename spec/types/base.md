# Base Types Specification

## Overview
Base types define the core contract for all `mtng-unstorage` drivers. They ensure consistent configuration for common features like read-only mode, namespace isolation (prefixes), and safety guards (clearing storage).

**Source**: `src/types/driver-base.ts`

## Configuration Options (`MTBaseDriverOptions`)

All drivers support these fundamental options:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `base` | `string` | `''` | Base path prefix for all keys. |
| `storagePrefix` | `string` | `''` | Preferred storage prefix. Replaces legacy `s3StoragePrefix`. |
| `name` | `string` | `undefined` | Driver name for debugging/logging. |
| `readOnly` | `boolean` | `false` | If `true`, disables `setItem`, `removeItem`, and `clear`. |
| `allowClear` | `boolean` | `false` | If `true`, enables the `clear` method. Defaults to `false` for safety. |
| `maxDepth` | `number` | `undefined` | Maximum directory depth for operations. |

### Derived Options (`ResolvedMTBaseDriverOptions`)
Internal drivers use a resolved version of options where defaults are applied:
- `fullBasePrefix`: Combines `base` + `storagePrefix`.

## Driver Interface (`BaseDriverMethods`)

The driver interface extends the standard `unstorage` driver but strictly types available methods based on configuration.

### Methods
- **`hasItem(key)`**: Check if an item exists.
- **`getItem(key)`**: Retrieve an item.
- **`getKeys(base?)`**: List available keys.
- **`setItem(key, value)`**: Store an item (Unavailable in `readOnly`).
- **`removeItem(key)`**: Delete an item (Unavailable in `readOnly`).
- **`clear(base?)`**: Remove all items (Only available if `allowClear: true` AND `!readOnly`).

## Conditional Typing (`ConditionalDriver`)

TypeScript types are used to enforce configuration at compile time:

```typescript
// Example: Read-Only Driver
const roDriver = awsS3Driver({ bucket: '...', readOnly: true });
// roDriver.setItem(...) // Compile Error

// Example: Safe Driver (Default)
const safeDriver = awsS3Driver({ bucket: '...' });
// safeDriver.clear() // Compile Error (allowClear defaults to false)
```
