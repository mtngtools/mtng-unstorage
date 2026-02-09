# AWS DynamoDB Driver Specifications (aws-ddb)

## Overview
The AWS DynamoDB driver enables using Amazon DynamoDB as a key-value storage backend.

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
> Strategies 3, 4, and 5 access Secondary Indexes which are inherently Read-Only in DynamoDB. Write operations (`setItem`, `removeItem`, `clear`) using these strategies will throw an error or be disabled if `readOnly: true` is enforced.


#### Key Mapping Logic

The driver maps the `unstorage` `key` argument to DynamoDB keys based on the selected strategy.

**Strategies involving Sort Keys (Triggered by strategies 2, 3, 5)**
When a Sort Key is involved, the `unstorage` `key` is treated as the **Sort Key**. The **Partition Key** is resolved from the following sources, in order of precedence:

1.  **Driver Option (`partitionKeyValue`)**: A static PK value defined at driver initialization.
2.  **Storage Prefix (`storagePrefix`)**: If no driver option is set, the `storagePrefix` (if present) is used as the PK value.
3.  **Transaction Option (`partitionKeyValue`)**: If neither of the above are set, the PK value must be provided in the transaction options.

**Strategies NOT involving Sort Keys (Triggered by strategies 1, 4)**
When no Sort Key is involved, the `unstorage` `key` is treated as the **Partition Key**.
- Standard `unstorage` behavior applies: `storagePrefix` and `base` are prepended to the `key` to form the final Partition Key.

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
These strategies treat the `unstorage` `key` as the Sort Key. The Partition Key must be defined via `partitionKey` option, `storagePrefix`, or transaction options.

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
type AwsDdbDriverOptions = AwsGeneralOptions & (SortKeyStrategyOptions | PartitionKeyStrategyOptions);
```

### Transaction Options

The driver supports the following transaction options, which can be passed to operations like `setItem`, `getItem`, etc.

| Option | Type | Description |
| :--- | :--- | :--- |
| `partitionKeyValue` | `string` | **Required** if not set in Driver Options or via `storagePrefix` (for strategies involving Sort Keys). Overrides potentially ambiguous PK resolution. |
| `consistentRead` | `boolean` | If set, overrides the driver-level `consistentRead` setting. |


## Behavior

### Table Schema
The driver expects a table with a primary key (partition key) to store the item key.
- **Default Value Attribute**: `value` (string, binary, or object). Configurable via `valueAttributeName`. 
  - If `returnFullObject` is `true`: The entire item is treated as the value. **Important**: On `setItem`, the driver *enforces* the PK (and SK) based on the method arguments/configuration, overwriting any conflicting keys present in the value object.



### Operations
- **`setItem`**: Puts an item into the table (`PutItem`).
- **`getItem`**: Gets an item from the table (`GetItem`).
- **`removeItem`**: Deletes an item (`DeleteItem`).
- **`getKeys`**: Scans table for keys (Note: Scan operations can be expensive).

### Testing Considerations

Testing the `aws-ddb` driver requires special handling due to the nature of DynamoDB indexes.

- **Write vs. Read Paths**:
    - Strategies 1 & 2 (Table Access) support both Read and Write operations.
    - Strategies 3, 4, & 5 (Index Access) are **Read-Only**.

- **Test Pattern for Index Strategies**:
    - Standard `unstorage` tests expect a driver to be able to write and then read back data.
    - specialized tests for Index strategies must use a **separate "Writer" driver instance** (configured with Strategy 1 or 2) to populate the table.
    - The "Reader" driver (configured with the Index strategy) is then used to verify that the data can be retrieved correctly via the index.

> [!IMPORTANT]
> **Testing Complexity**: Unlike other drivers that implement the base test suite once, the `aws-ddb` driver must run the suite **11 times** to validate all access patterns and Partition Key resolution paths.
>
> **Breakdown of Test Scenarios (11 Total)**:
> 1.  **Strategies with Sort Key (9 Tests)**:
>     - Strategies: `table_pk_sk`, `lsi`, `gsi_pk_sk` (3 strategies).
>     - PK Resolution Paths: Driver Option, Storage Prefix, Transaction Option (3 paths).
>     - Calculation: 3 Strategies * 3 Paths = **9 Tests**.
> 2.  **Strategies without Sort Key (2 Tests)**:
>     - Strategies: `table_pk`, `gsi_pk` (2 strategies).
>     - PK Resolution Path: Standard `unstorage` behavior (1 path).
>     - Calculation: 2 Strategies * 1 Path = **2 Tests**.


### Test Configuration (Environment Variables)

To facilitate testing across all 5 strategies, the following environment variables are required. These ensure that the test runner can target the correct tables and indexes with the appropriate key configurations.

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

## Implementation Preference

Implement AwsDdbDriver class using DynamoDBDocumentClient.


