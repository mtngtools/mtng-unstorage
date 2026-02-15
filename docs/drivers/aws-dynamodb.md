# AWS DynamoDB Driver

An AWS DynamoDB storage driver for unstorage using the official AWS SDK for JavaScript v3.

## Features

- ✅ **AWS SDK Integration**: Uses official AWS SDK v3 for maximum compatibility
- ✅ **Flexible Access Patterns**: Support for Table (PK or PK+SK), Local Secondary Index (LSI), and Global Secondary Index (GSI)
- ✅ **Read-Only Mode**: Configurable read-only mode (enforced for Index strategies)
- ✅ **Clear Protection**: Explicit opt-in required for clear operations to prevent accidental data loss
- ✅ **TypeScript Support**: Full TypeScript support with detailed type definitions

> Flex variant: In addition to the base driver, a flex variant adds custom key and value mapping hooks. See [Flex driver: custom mapping](#flex-driver-custom-mapping).

## Status

> [!WARNING]
> This driver is currently in **Beta**.
> - **Flex Driver**: Planned (Not yet implemented).
> - **Testing**: Comprehensive tests for all access scenarios (e.g. various Index strategies) are currently pending. Use with caution in production.

## Installation

```bash
pnpm install @mtngtools/unstorage @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb unstorage
```

## Basic Usage

```typescript
import { createStorage } from 'unstorage'
import { awsDynamoDBDriver } from '@mtngtools/unstorage'

// Create storage
const storage = createStorage({
  driver: awsDynamoDBDriver({
    tableName: 'my-table',
    region: 'us-east-1',
    // Strategy defaults to 'table_pk_sk' (Partition Key + Sort Key)
  })
})

// Use it
await storage.setItem('user:123', { name: 'John' })
const user = await storage.getItem('user:123')
```

## Configuration Options

The driver configuration depends on the **Query Strategy** you choose. The strategy determines how the driver maps keys to DynamoDB.

### Strategies

| Strategy | Description | Key Mapping | Access |
| :--- | :--- | :--- | :--- |
| `table_pk_sk` (Default) | Table with Partition Key + Sort Key | `key` -> Sort Key. Partition Key set via `partitionKeyValue` | Read/Write |
| `table_pk` | Table with Partition Key only | `key` -> Partition Key (prefixed with `storagePrefix` + `base`) | Read/Write |
| `lsi` | Local Secondary Index | `key` -> Sort Key. Partition Key set via `partitionKeyValue` | **Read-Only** |
| `gsi_pk_sk` | Global Secondary Index (PK + SK) | `key` -> Sort Key. Partition Key set via `partitionKeyValue` | **Read-Only** |
| `gsi_pk` | Global Secondary Index (PK only) | `key` -> Partition Key | **Read-Only** |

### Common Options

```typescript
interface AwsDynamoDBDriverOptions {
  // Required
  tableName: string             // DynamoDB table name
  region: string                // AWS Region

  // Optional
  accessKeyId?: string          // AWS Access Key ID
  secretAccessKey?: string      // AWS Secret Access Key
  sessionToken?: string         // Optional session token
  dynamoDbClient?: DynamoDBClient // Pre-configured client

  // Driver Options
  name?: string                 // Driver name (default: 'aws-dynamodb')
  base?: string                 // Base path for this driver instance
  storagePrefix?: string        // Global storage prefix
  readOnly?: boolean            // Force read-only mode
  allowClear?: boolean          // Allow clear operations (default: false)
  
  // DynamoDB Specific
  partitionKeyName?: string     // PK attribute name (default: pk/gpk)
  sortKeyName?: string          // SK attribute name (default: sk/lsk/gsk)
  valueAttributeName?: string   // Value attribute name (default: value)
  returnFullObject?: boolean    // If true, returns full item object instead of just value
  consistentRead?: boolean      // specific strong consistency
}
```

### Strategy-Specific Options

**For Strategies with Sort Key (`table_pk_sk`, `lsi`, `gsi_pk_sk`)**:
You **must** provide a `partitionKeyValue` either in the driver options or per-transaction.

```typescript
// Driver-level partition key
const storage = createStorage({
  driver: awsDynamoDBDriver({
    tableName: 'my-table',
    region: 'us-east-1',
    strategy: 'table_pk_sk',
    partitionKeyValue: 'users' // All items will have pk='users'
  })
})

// Or per-transaction
await storage.setItem('123', data, { partitionKeyValue: 'users' })
```

### Index Strategies

For `lsi`, `gsi_pk`, or `gsi_pk_sk` strategies, you must provide `indexName`. These strategies are **Read-Only**.

```typescript
const storage = createStorage({
  driver: awsDynamoDBDriver({
    tableName: 'my-table',
    region: 'us-east-1',
    strategy: 'gsi_pk_sk',
    indexName: 'my-gsi',
    partitionKeyValue: 'active-users'
  })
})
```

## Additional Features

### Read-Only Mode

Index strategies are automatically read-only. You can also force read-only mode on table strategies:

```typescript
const storage = createStorage({
  driver: awsDynamoDBDriver({
    tableName: 'my-table',
    region: 'us-east-1',
    readOnly: true
  })
})
```

### Clear Protection

Clear operations require `allowClear: true`. For strategies with Sort Keys, it also requires a `partitionKeyValue` to be set (either in driver options or transaction options) to prevent deleting the entire table context.

### Transaction Options

You can pass per-request options:

```typescript
await storage.getItem('key', {
  partitionKeyValue: 'override-pk',
  consistentRead: true
})
```

### Prefix Search

The `getItems` method supports efficient prefix searching:

```typescript
// Fetch all items starting with 'user:' using Query (begins_with)
const items = await storage.getItems([{ key: 'user:' }], {
  returnStartsWithKey: true
})
```
