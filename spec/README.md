# mtng-unstorage Specifications

**mtng-unstorage** provides custom storage drivers for [unstorage](https://unjs.io/unstorage), focused on AWS services support with type-safe configuration and flexible data mapping.

## Overview

This package offers a set of drivers that extend the standard `unstorage` capabilities:

- **Base Drivers**: Standard key-value storage operations.
- **Flex Drivers**: Advanced drivers with custom key and value mapping (e.g., for legacy S3 paths or automatic JSON serialization).
- **Versioned Drivers**: (Planned) Support for versioned storage operations.

## Architecture

The library is structured around a core set of types and granular driver implementations.

### 1. Types & Interfaces
Core definitions that ensure consistency across all drivers.
- [Base Types](types/base.md): Common options (`readOnly`, `allowClear`) and driver interfaces.
- [Flex Types](types/flex.md): Advanced mapping configuration for Flex drivers.
- [Versioned Types](types/versioned.md): (Planned) Versioning interfaces.

### 2. Drivers
Specific storage backend implementations.
- [AWS S3](drivers/aws-s3/README.md): S3 driver supporting standard and flex modes.
- [AWS SSM](drivers/aws-ssm/README.md): Systems Manager Parameter Store driver.
- [AWS DynamoDB](drivers/aws-ddb/README.md): DynamoDB key-value driver.

### 3. Testing
- [Testing Strategy](testing.md): Overview of unit and E2E testing approaches.