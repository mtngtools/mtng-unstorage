/**
 * E2E MT Tests Entry Point
 * 
 * Imports all driver-specific MT tests for E2E testing (with real clients).
 * These tests run alongside the core tests in drivers-core.test.ts
 * 
 * Note: Driver test files in tests/drivers/ are shared between integration and e2e.
 * They will use real clients when run in E2E mode (determined by VITEST_MODE env var).
 */

// Import driver-specific MT tests (these will use real clients in E2E mode)
import '../drivers/aws-s3/aws-s3-base.test.js'
import '../drivers/aws-s3/aws-s3-flex.test.js'
// Future: import '../drivers/aws-s3/aws-s3-flex.test.js'
// Future: import '../drivers/aws-s3/aws-s3-versioned.test.js'
// Future: import '../drivers/aws-dynamodb/aws-dynamodb-base.test.js'
// Future: import '../drivers/aws-dynamodb/aws-dynamodb-flex.test.js'
// Future: import '../drivers/aws-dynamodb/aws-dynamodb-versioned.test.js'
import '../drivers/aws-ssm/aws-ssm-base.test.js'
import '../drivers/aws-ssm/aws-ssm-flex.test.js'

