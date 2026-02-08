# AWS Systems Manager Parameter Store Driver Specifications (aws-ssm)

## Overview
The AWS Systems Manager (SSM) driver enables using AWS Parameter Store as a key-value storage backend.

## Configuration

For details on common driver options and advanced features, refer to the [Base](../../types/base.md) and [Flex](../../types/flex.md) type specifications. aws-ssm does not currently support versioning.

### AWS General Options
| Option | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `region` | `string` | **Yes** | AWS Region (e.g., `us-east-1`). |
| `accessKeyId` | `string` | No | AWS Access Key ID. |
| `secretAccessKey` | `string` | No | AWS Secret Access Key. |
| `sessionToken` | `string` | No | Optional session token. |
| `ssmClient` | `SSMClient` | No | Pre-configured AWS SDK v3 client instance. |

### SSM Specific Options
| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `withDecryption` | `boolean` | No | `true` | When `true`, decrypt SecureString parameters when reading (`GetParameter`, `GetParametersByPath`). Can be overridden per request via the driver operation's options. |

## Behavior

### Key Mapping
- Keys are mapped to SSM parameter names.
- Recommended to use hierarchical keys (e.g., `/my-app/config/key`) which map well to `unstorage` colon-separated keys.

### Request options
Read operations accept an optional options object. SSM driver supports:
- **`withDecryption`** (`boolean`, optional): Overrides the driver-level `withDecryption` for this request only. Defaults to the driver option when not provided.

### Operations
- **`setItem`**: Creates or updates a parameter (`PutParameter`).
- **`getItem`**: Retrieves a parameter value (`GetParameter`). Uses `WithDecryption` per driver/request option.
- **`removeItem`**: Deletes a parameter (`DeleteParameter`).
- **`getKeys`**: Lists parameters by path (`GetParametersByPath`). Uses `WithDecryption` per driver/request option.
- **`clear`**: Deletes all parameters under the configured prefix.
    - **Constraint**: Requires `allowClear: true` **AND** a non-empty `storagePrefix` (or `base`).
    - **Safety**: Cannot be run on the root path `/` to prevent accidental deletion of all account parameters.
