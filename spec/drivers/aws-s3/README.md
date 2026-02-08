# AWS S3 Driver Specifications (aws-s3)

## Overview
The AWS S3 driver provides a backend for storing items in Amazon S3. It supports standard operations and includes a flexible variant for advanced use cases.

**Source**: `src/drivers/aws-s3/`

## Drivers

This package exports two main driver factories:

- **`awsS3Driver`**: Standard S3 driver. Simplest configuration.
- **`awsS3FlexDriver`**: Flex driver with custom key/value mapping support.

## Configuration (`AwsS3DriverOptions`)

For details on common driver options and advanced features, refer to the [Base](../../types/base.md), [Flex](../../types/flex.md), and [Versioned](../../types/versioned.md) type specifications.

All S3 drivers require standard AWS SDK credentials and bucket configuration.

### AWS General Options
| Option | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `region` | `string` | No* | AWS Region (e.g., `us-east-1`). Required if client not provided. |
| `accessKeyId` | `string` | No* | AWS Access Key ID. |
| `secretAccessKey` | `string` | No* | AWS Secret Access Key. |
| `sessionToken` | `string` | No | Optional session token. |
| `s3Client` | `S3Client` | No | Pre-configured AWS SDK v3 client instance. |

\* Credentials can be omitted if `s3Client` is provided or if using environment variables/IAM roles supported by the AWS SDK default provider chain.

### S3 Specific Options
| Option | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `bucket` | `string` | **Yes** | The S3 bucket name. |

## Behavior

### Key Mapping
- **Default**: Keys are treated as S3 object keys. Optional `base` or `storagePrefix` are prepended.
- **Flex Driver**: Can be overridden with `toStorageKey` / `fromStorageKey`.

### Value Serialization
- **Default**: Values are stored as raw strings/bytes.
- **Flex Driver**: Can be overridden with `toStorageValue` / `fromStorageValue` (e.g., for JSON).

### Operations
- **`setItem`**: Uploads object to S3.
- **`getItem`**: Downloads object from S3. returns `null` if not found (404).
- **`removeItem`**: Deletes object from S3.
- **`getKeys`**: Lists objects in bucket (paginated internally).
- **`clear`**: Deletes all objects under the configured prefix. **Use with caution**.

## Example

```typescript
import { awsS3Driver } from '@mtngtools/unstorage';

const storage = awsS3Driver({
  bucket: 'my-app-storage',
  region: 'us-west-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

await storage.setItem('user:123', 'some data');
const data = await storage.getItem('user:123');
```