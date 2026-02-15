# Storage Drivers

This package provides multiple storage drivers for [unstorage](https://github.com/unjs/unstorage).

## Available Drivers

| Driver | Status | Description | Key Features |
|--------|--------|-------------|--------------|
| [**AWS S3**](./aws-s3.md) | ✅ **Stable** | AWS S3 driver using AWS SDK v3 | maxDepth, readOnly, allowClear, custom S3 options |
| [**AWS S3 (Flex)**](./aws-s3.md#flex-driver-custom-mapping) | ✅ **Stable** | Flexible S3 driver with custom key/value mapping | custom key mapping, custom value mapping, maxDepth |
| [**AWS SSM**](./aws-ssm.md) | ✅ **Stable** | AWS Parameter Store driver using AWS SDK v3 | withDecryption, readOnly, allowClear, maxDepth |
| [**AWS SSM (Flex)**](./aws-ssm.md#flex-driver-custom-mapping) | ✅ **Stable** | Flexible SSM driver with custom key/value mapping | custom key mapping, custom value mapping, maxDepth |
| [**AWS DynamoDB**](./aws-dynamodb.md) | ✅ **Stable** | AWS DynamoDB driver using AWS SDK v3 | Query strategies (Table, LSI, GSI), readOnly, allowClear |

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