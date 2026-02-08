# AWS DynamoDB Driver Specifications (aws-ddb)

## Overview
The AWS DynamoDB driver enables using Amazon DynamoDB as a key-value storage backend.

## Configuration

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

### DynamoDB Specific Options
| Option | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `tableName` | `string` | **Yes** | The DynamoDB table name. |

## Behavior

### Table Schema
The driver expects a table with a primary key (partition key) to store the item key.
- **Default Partition Key**: `pk` (string).
- **Default Value Attribute**: `value` (string or binary).

### Operations
- **`setItem`**: Puts an item into the table (`PutItem`).
- **`getItem`**: Gets an item from the table (`GetItem`).
- **`removeItem`**: Deletes an item (`DeleteItem`).
- **`getKeys`**: Scans table for keys (Note: Scan operations can be expensive).
