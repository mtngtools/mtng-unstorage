# Versioned Types Specification

## Overview
> [!NOTE]
> This feature is planned for a future release.

Versioned types will support drivers that maintain history or versioning for stored items.

**Source**: `src/types/driver-versioned.ts`

## Proposed Features

- **Store Version**: `setItem` may return a version ID or ETag.
- **Get Version**: `getItem` may accept a version ID to retrieve a specific historical state.
- **List Versions**: `getVersions(key)` to list available versions for a specific item.
