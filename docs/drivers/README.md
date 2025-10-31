# Storage Drivers

This package provides multiple storage drivers for [unstorage](https://github.com/unjs/unstorage).

## Available Drivers

| Driver | Status | Description | Key Features |
|--------|--------|-------------|--------------|
| [**AWS S3**](./aws-s3.md) | ✅ **Stable** | AWS S3 driver using AWS SDK v3 | maxDepth, readOnly, allowClear, custom S3 options |

## Common Interface

All drivers implement the `MTBaseDriverOptions` interface:

```typescript
interface MTBaseDriverOptions {
  base?: string                 // Base path prefix for all keys
  name?: string                 // Driver name for debugging
  readOnly?: boolean           // When true, prevents write operations
  allowClear?: boolean         // When true, allows clear operations (default: false)
}
```