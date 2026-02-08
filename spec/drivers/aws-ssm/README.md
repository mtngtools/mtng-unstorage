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
*None currently required beyond standard AWS options.*

## Behavior

### Key Mapping
- Keys are mapped to SSM parameter names.
- Recommended to use hierarchical keys (e.g., `/my-app/config/key`) which map well to `unstorage` colon-separated keys.

### Operations
- **`setItem`**: Creates or updates a parameter (`PutParameter`).
- **`getItem`**: Retrieves a parameter value (`GetParameter`).
- **`removeItem`**: Deletes a parameter (`DeleteParameter`).
- **`getKeys`**: Lists parameters by path (`GetParametersByPath`).
- **`clear`**: Deletes all parameters under the configured prefix.
    - **Constraint**: Requires `allowClear: true` **AND** a non-empty `storagePrefix` (or `base`).
    - **Safety**: Cannot be run on the root path `/` to prevent accidental deletion of all account parameters.
