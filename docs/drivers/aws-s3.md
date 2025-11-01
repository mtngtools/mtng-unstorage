# AWS S3 Driver

An AWS S3 storage driver for unstorage using the official AWS SDK for JavaScript v3.

## Features

- ✅ **Full AWS SDK Integration**: Uses official AWS SDK v3 for maximum compatibility
- ✅ **Support for native credentials**: Does not require AWS credentials to instantiate if S3Client finds them in runtime enviroment
- ✅ **MaxDepth Support**: Native support for filtering keys by depth
- ✅ **Read-Only Mode**: Configurable read-only mode to prevent write operations
- ✅ **Clear Protection**: Explicit opt-in required for clear operations to prevent accidental data loss
- ✅ **Custom S3 Options**: Support for custom S3 PutObject parameters (encryption, metadata, etc.)
- ✅ **TypeScript Support**: Full TypeScript support with detailed type definitions

## Installation

```bash
pnpm install @mtng/unstorage @aws-sdk/client-s3 unstorage
```

## Basic Usage

```typescript
import { createStorage } from 'unstorage'
import { S3Client } from '@aws-sdk/client-s3'
import { awsS3Driver } from '@mtng/unstorage'

// Create S3 client (add region and credentials if not available from environment)
const s3Client = new S3Client({})

// Create storage instance
const storage = createStorage({
  driver: awsS3Driver({
    s3Client,
    bucket: 'my-storage-bucket'
  })
})

// Basic operations
await storage.setItem('user:123', { name: 'John', email: 'john@example.com' })
const user = await storage.getItem('user:123')
const keys = await storage.getKeys()
const exists = await storage.hasItem('user:123')
await storage.removeItem('user:123')
```

## Configuration Options

```typescript
interface AwsS3DriverOptions extends MTBaseDriverOptions {
  // Required
  s3Client: S3Client            // AWS S3 client instance
  bucket: string                // S3 bucket name
  
  // Optional S3-specific
  s3StoragePrefix?: string      // Global S3 storage prefix for all keys
  
  // Inherited from MTBaseDriverOptions
  base?: string                 // Base path for this driver instance
  name?: string                 // Driver name (default: 'aws-s3')
  readOnly?: boolean            // Enable read-only mode (default: false)
  allowClear?: boolean          // Allow clear operations (default: false)
}
```

### Understanding `base` vs `s3StoragePrefix`

These two options serve different purposes and should be chosen based on your use case:

**Use `base`** when:
- You're categorizing the type of data being stored (e.g., `users`, `cache`, `sessions`)
- You might switch between different storage drivers (filesystem, Redis, S3, etc.)
- You want driver-agnostic organization of your data
- Example: `base: 'users'` could work with any unstorage driver

**Use `s3StoragePrefix`** when:
- You need S3-specific bucket organization or namespacing
- You're working with existing S3 files that have a specific prefix structure
- You want to isolate your application's data within a shared S3 bucket
- The prefix is tied to S3 infrastructure and wouldn't make sense with other drivers
- Example: `s3StoragePrefix: 'app-prod/data'` for production environment isolation

```typescript
// Good: Using base for data categorization (driver-agnostic)
const userStorage = createStorage({
  driver: awsS3Driver({ s3Client, bucket: 'my-bucket', base: 'users' })
})

// Good: Using s3StoragePrefix for S3-specific organization
const prodStorage = createStorage({
  driver: awsS3Driver({ 
    s3Client, 
    bucket: 'shared-bucket', 
    s3StoragePrefix: 'app-prod/v2' 
  })
})

// You can combine both for maximum organization
const userCacheStorage = createStorage({
  driver: awsS3Driver({ 
    s3Client, 
    bucket: 'shared-bucket',
    s3StoragePrefix: 'app-prod',  // Environment/app isolation
    base: 'cache'                 // Data type categorization
  })
})
```

## Additional Features

### Read-Only Mode

Prevent all write operations while allowing read operations:

```typescript
const storage = createStorage({
  driver: awsS3Driver({
    s3Client,
    bucket: 'my-bucket',
    readOnly: true  // Prevents setItem, removeItem, and clear
  })
})

// These will work
await storage.getItem('key')
await storage.hasItem('key')
await storage.getKeys()

// These will throw errors
await storage.setItem('key', 'value')     // Error: Cannot perform setItem: driver is in read-only mode
await storage.removeItem('key')           // Error: Cannot perform removeItem: driver is in read-only mode
await storage.clear()                     // Error: Cannot perform clear: driver is in read-only mode
```

### Clear Protection

Require explicit opt-in for clear operations to prevent accidental data loss:

```typescript
// Default: clear operations are disabled
const storage = createStorage({
  driver: awsS3Driver({
    s3Client,
    bucket: 'my-bucket'
    // allowClear defaults to false
  })
})

await storage.clear()  // Error: Cannot perform clear: allowClear option must be set to true

// Enable clear operations
const storageWithClear = createStorage({
  driver: awsS3Driver({
    s3Client,
    bucket: 'my-bucket',
    allowClear: true  // Explicitly enable clear operations
  })
})

await storageWithClear.clear()  // Works
```

### maxDepth Support

Filter keys by depth using colon separators:

```typescript
const storage = createStorage({
  driver: awsS3Driver({
    s3Client,
    bucket: 'my-bucket'
  })
})

// Store some nested data
await storage.setItem('users:123:profile', { name: 'John' })      // depth 2
await storage.setItem('users:123:settings:theme', 'dark')        // depth 3
await storage.setItem('users:456:profile', { name: 'Jane' })     // depth 2

// Get keys with depth filtering
const allKeys = await storage.getKeys('', {})                    // No limit
const depth2Keys = await storage.getKeys('', { maxDepth: 2 })    // ['users:123:profile', 'users:456:profile']
const depth3Keys = await storage.getKeys('', { maxDepth: 3 })    // All keys including settings
```

### Custom S3 Options

Pass custom S3 parameters for specific use cases:

```typescript
import type { S3PutObjectOptions } from '@mtng/unstorage'

// Basic setItem (no custom options)
await storage.setItem('simple-key', 'value')

// setItem with custom S3 options
await storage.setItem('user-data', { name: 'John', role: 'admin' }, {
  s3Options: {
    ContentType: 'application/json',
    CacheControl: 'max-age=86400',
    Metadata: {
      author: 'John Doe',
      department: 'Engineering',
      version: '1.0'
    },
    ServerSideEncryption: 'AES256',
    ACL: 'private'
  }
})

// Set item with encryption using KMS
await storage.setItem('sensitive-data', sensitiveData, {
  s3Options: {
    ServerSideEncryption: 'aws:kms',
    SSEKMSKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
    ContentType: 'application/json'
  }
})

// TypeScript support for custom options
const customOptions: S3PutObjectOptions = {
  ContentType: 'application/json',
  Metadata: {
    createdBy: 'api-service',
    timestamp: new Date().toISOString()
  }
}

await storage.setItem('api-data', jsonData, { s3Options: customOptions })
```

### Available S3 Options

You can use any parameter from AWS S3's `PutObjectCommand` except `Bucket`, `Key`, and `Body`:

- **ContentType**: MIME type of the object
- **CacheControl**: Caching behavior
- **ContentDisposition**: How the object should be displayed
- **ContentEncoding**: Encoding of the object
- **ContentLanguage**: Language of the object
- **Expires**: Expiration date for the object
- **Metadata**: User-defined metadata (key-value pairs)
- **ServerSideEncryption**: Encryption method ('AES256', 'aws:kms', etc.)
- **SSEKMSKeyId**: KMS key ID for encryption
- **ACL**: Access control list
- **StorageClass**: Storage class ('STANDARD', 'REDUCED_REDUNDANCY', etc.)
- **Tagging**: Object tags

## Key Structure

Keys are structured as: `[s3StoragePrefix]/[base]/[key]`

Example:
- `s3StoragePrefix`: `'myapp/'`
- `base`: `'users/'` 
- `key`: `'123'`
- Final S3 key: `'myapp/users/123'`

## Error Handling

The driver properly maps AWS S3 errors:

```typescript
try {
  await storage.setItem('key', value)
} catch (error) {
  if (error.name === 'AccessDenied') {
    console.error('S3 access denied')
  } else if (error.name === 'NoSuchBucket') {
    console.error('Bucket does not exist')
  } else if (error.name === 'NoSuchKey') {
    console.error('Object not found')
  } else {
    console.error('Storage error:', error)
  }
}
```

## AWS Client Configuration

### Basic Configuration

```typescript
import { S3Client } from '@aws-sdk/client-s3'

// Create S3 client (add region and credentials if not available from environment)
const s3Client = new S3Client({})

// Using environment credentials (recommended for production)
const s3Client = new S3Client({})
// Credentials and region will be loaded from environment/IAM role
})
```

### Environment-based Configuration

The AWS SDK automatically loads credentials from:
1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. AWS credentials file (`~/.aws/credentials`)
3. IAM roles (when running in AWS services)

## Testing

The driver includes test suites:

### Unit Tests
```bash
pnpm test
```

### E2E Tests
```bash
# Setup environment (copy .env.test to .env.test.local and configure)
cp .env.test .env.test.local

# Configure your test bucket in .env.test.local:
AWS_S3_E2E_ENABLED=true
AWS_S3_TEST_BUCKET=your-test-bucket
AWS_S3_TEST_PREFIX=test-prefix/

# Run E2E tests
pnpm run test:e2e
```

## Performance Considerations

- **Streaming**: Large objects are handled efficiently using streams
- **Batch Operations**: Clear operations delete objects in batches to avoid overwhelming S3
- **Connection Reuse**: Reuse the same S3Client instance across multiple storage instances
- **Prefixes**: Use appropriate S3 prefixes to optimize listing operations

## Troubleshooting

### Common Issues

1. **Access Denied**: Ensure your AWS credentials have appropriate S3 permissions
2. **Bucket Not Found**: Verify the bucket name and region
3. **Clear Not Working**: Make sure `allowClear: true` is set in options
4. **Read-Only Errors**: Check if `readOnly: true` is set when you expect writes

### Debug Mode

Enable AWS SDK debug logging:

```typescript
// Set environment variable
process.env.AWS_LOG_LEVEL = 'debug'

// Or configure the client (add region and credentials if not available from environment)
const s3Client = new S3Client({
  logger: console // Enable logging
})
```