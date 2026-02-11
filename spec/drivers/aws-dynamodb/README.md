# AWS DynamoDB Driver Specifications (aws-dynamodb)

## Overview
The AWS DynamoDB driver enables using Amazon DynamoDB as a key-value storage backend.

### Driver Variants
- **`awsDynamoDBDriver`**: Base driver with standard key-value operations.
- **`awsDynamoDBFlexDriver`**: (Planned) Flex driver with custom key/value mapping support.
- **`awsDynamoDBVersionedDriver`**: (Planned) Versioned driver with item history support.

## Configuration

### Query Strategy & Key Mapping

DynamoDB supports flexible access patterns involving tables, Local Secondary Indexes (LSI), and Global Secondary Indexes (GSI). To ensure consistent behavior, this driver requires a specific **Query Strategy** to be defined at initialization. This strategy determines how the driver interacts with the database for all requests.

#### Supported Strategies
The driver supports the following 5 strategies, mapping to DynamoDB's core access patterns:

1.  **Table (Partition Key only)**: Direct table access using only the PK. (Read/Write)
2.  **Table (Partition Key + Sort Key)**: Direct table access using PK and SK. (Read/Write)
3.  **Local Secondary Index (LSI)**: Access via LSI (uses table PK + LSI SK). (**Read-Only**)
4.  **Global Secondary Index (GSI - PK only)**: Access via GSI using only GSI PK. (**Read-Only**)
5.  **Global Secondary Index (GSI - PK + SK)**: Access via GSI using GSI PK and GSI SK. (**Read-Only**)

> [!NOTE]
> Strategies 3, 4, and 5 access Secondary Indexes which are inherently Read-Only in DynamoDB. For these strategies the driver **resolves as read-only**: write operations (`setItem`, `removeItem`, `clear`) are not available.
>
> **Index Projection Requirement**: For Index strategies to work, the Partition Key, Sort Key (if applicable), and the Value attribute (`value` or all attributes if `returnFullObject` is used) **must** be projected into the index (e.g., `INCLUDE` or `ALL`).

#### Resolved options (index strategies)

When creating **resolved driver options** at driver instantiation:

- If `strategy` is `lsi`, `gsi_pk`, or `gsi_pk_sk`, then `readOnly` **must** be set to `true` in the resolved options, **regardless** of the value passed in the user-supplied driver options.

This makes the driver read-only whenever it is using an index; no write methods are exposed and no runtime throw is needed for writes.


#### Key Mapping Logic

The driver maps the `unstorage` `key` argument to DynamoDB keys based on the selected strategy.

**Strategies involving Sort Keys (Triggered by strategies 2, 3, 5)**
When a Sort Key is involved, the `unstorage` `key` is treated as the **Sort Key**. The **Partition Key** is resolved only from explicit `partitionKeyValue`, in order of precedence:

1.  **Transaction Option (`partitionKeyValue`)**: Per-request PK value.
2.  **Driver Option (`partitionKeyValue`)**: Static PK value defined at driver initialization.

`storagePrefix` and `base` are **not** used for partition key value; they only affect PK-only strategies (see below) and key prefixing.

**Strategies NOT involving Sort Keys (Triggered by strategies 1, 4)**
When no Sort Key is involved, the `unstorage` `key` is treated as the **Partition Key**.
- Standard `unstorage` behavior applies: the effective key is the concat **storagePrefix + base + key** (same order as aws-s3), forming the final Partition Key value.

### Configuration

For details on common driver options and advanced features, refer to the [Base](../../types/base.md), [Flex](../../types/flex.md), and [Versioned](../../types/versioned.md) type specifications.

### AWS General Options
| Option | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `region` | `string` | **Yes** | AWS Region (e.g., `us-east-1`). |
| `accessKeyId` | `string` | No | AWS Access Key ID. |
| `secretAccessKey` | `string` | No | AWS Secret Access Key. |
| `sessionToken` | `string` | No | Optional session token. |
| `dynamoDbClient` | `DynamoDBClient` | No | Pre-configured AWS SDK v3 client instance. |

\* Credentials can be omitted if `dynamoDbClient` is provided or if using environment variables/IAM roles supported by the AWS SDK default provider chain.

### DynamoDB Specific Options (Discriminated Union)

The driver options are typed as a discriminated union based on the `strategy` field.

**Default Strategy**: `table_pk_sk` (if `strategy` is omitted).

#### Strategies with Sort Key (Requires Partition Key)
These strategies treat the `unstorage` `key` as the Sort Key. The Partition Key must be defined via `partitionKeyValue` (driver or transaction options only; `storagePrefix` and `base` are not used for PK value).

**Common Options**:
| Option | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `tableName` | `string` | **Yes** | The DynamoDB table name. |
| `partitionKeyValue` | `string` | No | Default Partition Key value to use for requests. |
| `partitionKeyName` | `string` | No | Name of the Partition Key attribute. Defaults: `pk` (Table/LSI), `gpk` (GSI). |
| `sortKeyName` | `string` | No | Name of the Sort Key attribute. Defaults: `sk` (Table), `lsk` (LSI), `gsk` (GSI). |
| `valueAttributeName` | `string` | No | Name of the attribute to store/retrieve the value. Default `value`. Ignored if `returnFullObject` is `true`. |
| `returnFullObject` | `boolean` | No | If `true`, `getItem` returns the entire DynamoDB item (object) and `setItem` stores the input object directly. Default `false`. |
| `consistentRead` | `boolean` | No | If `true`, performs a strongly consistent read. Default `false`. |

**Strategies**:
- **`table_pk_sk`** (Default): Direct table access (PK + SK).
- **`lsi`**: Local Secondary Index access. Requires `indexName`.
- **`gsi_pk_sk`**: Global Secondary Index access (PK + SK). Requires `indexName`.

```typescript
type SortKeyStrategyOptions = {
    tableName: string;
    partitionKeyValue?: string;
    partitionKeyName?: string;
    sortKeyName?: string;
    valueAttributeName?: string;
    returnFullObject?: boolean;
    consistentRead?: boolean;
} & (
    | { strategy?: 'table_pk_sk' }
    | { strategy: 'lsi'; indexName: string }
    | { strategy: 'gsi_pk_sk'; indexName: string }
);
```

#### Strategies without Sort Key (Partition Key Only)
These strategies treat the `unstorage` `key` as the Partition Key.

**Common Options**:
| Option | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `tableName` | `string` | **Yes** | The DynamoDB table name. |
| `partitionKeyName` | `string` | No | Name of the Partition Key attribute. Defaults: `pk` (Table), `gpk` (GSI). |
| `valueAttributeName` | `string` | No | Name of the attribute to store/retrieve the value. Default `value`. Ignored if `returnFullObject` is `true`. |
| `returnFullObject` | `boolean` | No | If `true`, `getItem` returns the entire DynamoDB item (object) and `setItem` stores the input object directly. Default `false`. |
| `consistentRead` | `boolean` | No | If `true`, performs a strongly consistent read. Default `false`. |

**Strategies**:
- **`table_pk`**: Direct table access (PK only).
- **`gsi_pk`**: Global Secondary Index access (PK only). Requires `indexName`.

```typescript
type PartitionKeyStrategyOptions = {
    tableName: string;
    partitionKeyName?: string;
    valueAttributeName?: string;
    returnFullObject?: boolean;
    consistentRead?: boolean;
} & (
    | { strategy: 'table_pk' }
    | { strategy: 'gsi_pk'; indexName: string }
);
```

#### Union Type
The full driver options type is the union of these strategies:
```typescript
type AwsDynamoDBDriverOptions = AwsGeneralOptions & (SortKeyStrategyOptions | PartitionKeyStrategyOptions);
```

### Transaction Options

The driver supports the following transaction options, which can be passed to operations like `setItem`, `getItem`, `getItems`, etc.

| Option | Type | Description |
| :--- | :--- | :--- |
| `partitionKeyValue` | `string` | **Required** if not set in Driver Options (for strategies involving Sort Keys). Overrides with per-request PK when provided in transaction options. |
| `consistentRead` | `boolean` | If set, overrides the driver-level `consistentRead` setting. |
| `returnStartsWithKey` | `boolean` | For `getItems` only. Default `false`. When `true`, the driver treats the request as a **prefix match**: the caller supplies a single key (prefix), and the driver uses a `Query` with a key condition (e.g. `begins_with` on the sort key, or on the partition key for PK-only strategies) to return all items whose key starts with that prefix. More efficient than listing then fetching when the intent is "everything under this prefix." Ignored when `getItems` is called with multiple keys. |


## Behavior

For index strategies (`lsi`, `gsi_pk`, `gsi_pk_sk`), resolved options have `readOnly` set to `true`.

### Table Schema
The driver expects a table with a primary key (partition key) to store the item key.
- **Default Value Attribute**: `value` (string, binary, or object). Configurable via `valueAttributeName`. 
  - If `returnFullObject` is `true`: The entire item is treated as the value. **Important**: On `setItem`, the driver *enforces* the PK (and SK) based on the method arguments/configuration, overwriting any conflicting keys present in the value object.



### Operations
- **`setItem`**: Puts an item into the table (`PutItem`).
- **`getItem`**: Gets an item from the table (`GetItem`).
- **`getItems`**: Gets multiple items. Two modes:
    - **Default (multiple keys or option off)**: Uses `BatchGetItem` to fetch the requested keys by full primary key (e.g. up to 100 keys per request). Works for all strategies.
    - **Prefix mode** (transaction option `returnStartsWithKey: true` and a **single** key): Uses a single `Query` with a key condition (e.g. `begins_with` on sort key for Sort Key strategies, or `begins_with` on partition key for PK-only strategies) to return all items whose key starts with the given prefix. More efficient when the intent is "everything under this prefix." When multiple keys are passed, `returnStartsWithKey` is ignored and BatchGetItem behavior is used.
- **`removeItem`**: Deletes an item (`DeleteItem`).
- **`getKeys`**: Lists keys using `Query` (for strategies with Sort Key) or `Scan` (for PK-only strategies).
- **`clear`**: Deletes all items under the configured prefix.
    - **Constraint**: Requires `allowClear: true` **AND** either a non-empty `partitionKeyValue` (for sort-key strategies) or a non-empty `base`/`storagePrefix` (for PK-only strategies, to scope which partition keys to delete).
    - **Safety**: For strategies with Sort Key, cannot be run without an explicit `partitionKeyValue` to prevent accidental deletion.

### TTL Support
> [!NOTE]
> TTL (Time-To-Live) support is planned for a future release.

### Testing Considerations

Testing the `aws-ddb` driver requires special handling due to the nature of DynamoDB indexes.

- **Write vs. Read Paths**:
    - Strategies 1 & 2 (Table Access) support both Read and Write operations.
    - Strategies 3, 4, & 5 (Index Access) are **Read-Only**.

- **Test Pattern for Index Strategies**:
    - Standard `unstorage` tests expect a driver to be able to write and then read back data.
    - specialized tests for Index strategies must use a **separate "Writer" driver instance** (configured with Strategy 1 or 2) to populate the table.
    - The "Reader" driver (configured with the Index strategy) is then used to verify that the data can be retrieved correctly via the index.
    - **GSI Latency**: Since Global Secondary Indexes are eventually consistent, the "Reader" test suite must account for propagation delays (e.g., via retries or polling) when verifying writes.

> [!IMPORTANT]
> **Testing Complexity**: Unlike other drivers that implement the base test suite once, the `aws-dynamodb` driver is validated across multiple access patterns and Partition Key resolution paths using the unified `drivers-core.test.ts` runner.
>
> **Breakdown of Test Scenarios (8 Total)**:
> 1.  **Strategies with Sort Key (6 Tests)**:
>     - Strategies: `table_pk_sk`, `lsi`, `gsi_pk_sk` (3 strategies).
>     - PK Resolution Paths: Driver Option (`partitionKeyValue`), Transaction Option (`partitionKeyValue`) only (2 paths). `storagePrefix` and `base` are not used for partition key value.
>       - When testing PK via Transaction Option, an alternate method for clearing may be required, since clear requires a non-empty `partitionKeyValue` (driver or transaction).
>     - Calculation: 3 Strategies * 2 Paths = **6 Tests**.
> 2.  **Strategies without Sort Key (2 Tests)**:
>     - Strategies: `table_pk`, `gsi_pk` (2 strategies).
>     - PK Resolution Path: Standard `unstorage` behavior (1 path).
>     - Calculation: 2 Strategies * 1 Path = **2 Tests**.


### Test Configuration (Environment Variables)

To facilitate testing across all 5 strategies, the following environment variables are required. These ensure that the test runner can target the correct tables and indexes with the appropriate key configurations.

#### General
- `AWS_DDB_E2E_ENABLED`: Set to `true` to run DynamoDB E2E tests.

#### Table Names
- `AWS_DDB_TABLE_PK_SK`: Table with Partition Key and Sort Key (supports strategies 2, 3, 5).
- `AWS_DDB_TABLE_PK`: Table with Partition Key only (supports strategies 1, 4).

#### Index Names
- `AWS_DDB_LSI_INDEX_NAME`: Name of the Local Secondary Index on `AWS_DDB_TABLE_PK_SK`.
- `AWS_DDB_GSI_Index_NAME`: Name of the Global Secondary Index on `AWS_DDB_TABLE_PK_SK` (for strategy 5) OR `AWS_DDB_TABLE_PK` (for strategy 4).

#### Key Names (Optional - Defaults shown)
- `AWS_DDB_PK_NAME`: Partition Key name for tables (default: `pk`).
- `AWS_DDB_SK_NAME`: Sort Key name for `AWS_DDB_TABLE_PK_SK` (default: `sk`).
- `AWS_DDB_LSK_NAME`: Sort Key name for LSI (default: `lsk`).
- `AWS_DDB_GPK_NAME`: Partition Key name for GSI (default: `gpk`).
- `AWS_DDB_GSK_NAME`: Sort Key name for GSI (default: `gsk`).

#### Other (Optional)
- `AWS_DDB_PROPAGATION_DELAY`: Time in milliseconds to wait for GSI propagation during tests (default: `1000`).

## Implementation Preference

Implement AwsDynamoDBDriver class using DynamoDBDocumentClient.

## Naming Guidance
 
 The following naming conventions should be used for the `aws-dynamodb` driver to ensure clarity and consistency. This distinguishes between the generic service name, the specific driver implementation, and environment variables. Suffixes consistent with other drivers should be used as needed (for things like flex, versioned, etc. ).
 
### In Docs

- **In Prose**: `AWS DynamoDB`
- **In Code**: `aws-dynamodb`

 ### Driver & Files
 - **In Folder Name**: `aws-dynamodb`
 - **In File Name**: `aws-dynamodb`
 - **Driver Name**: `aws-dynamodb` (e.g. `drivers/aws-dynamodb/`)

 ### Classes & Functions
 - **Class Name**: `AwsDynamoDBDriver`
 - **Factory Function**: `awsDynamoDBDriver`
  
 ### Environment Variables
 - **Prefix**: `AWS_DDB_` (Shortened for brevity in env vars)
   - Example: `AWS_DDB_TABLE_NAME`
   - Example: `AWS_DDB_REGION`
 
 ### Interfaces and Types
 - **Types**: `AwsDynamoDB`
