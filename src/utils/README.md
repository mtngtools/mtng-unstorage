# Utils Directory

This directory contains utility functions organized by purpose.

## Files

- **`common-storage.ts`** - Storage-specific common utilities used by all drivers
- **`common-lib.ts`** - Generic library functions that would normally be in a core library package, but are included here to avoid external dependencies. There's nothing special about them being here - they're here only to avoid having a dependency on another package.
- **`provider-aws.ts`** - AWS provider-specific utilities
- **`variant-flex.ts`** - Flex variant-specific utilities (future functionality)
- **`variant-versioned.ts`** - Versioned variant-specific utilities (future functionality)
- **`index.ts`** - Re-exports all utilities to maintain API compatibility

