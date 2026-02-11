/**
 * Integration MT Tests Entry Point
 * 
 * Imports all driver-specific MT tests for integration testing (with mocks).
 * These tests run alongside the core tests in drivers-core.test.ts
 */

// Import driver-specific MT tests (these use mocks)
import '../drivers/aws-s3/aws-s3-base.test.js'
// import '../drivers/aws-s3/aws-s3-flex.test.js'
// Import TypeScript type tests (integration only, not E2E)
import '../drivers/aws-s3/aws-s3-base-types.test.js'
import '../drivers/aws-s3/aws-s3-flex-types.test.js'
// Import comparison tests (integration only, not E2E)
import '../drivers/aws-s3/aws-s3-compare.test.js'
// Import shared utilities tests (integration only, not E2E)
import '../drivers/aws-s3/shared-public.test.js'
import '../drivers/aws-s3/shared-deprecated.test.js'
import '../drivers/aws-s3/shared-internal.test.js'
import '../drivers/aws-s3/shared-native.test.js'
// Import utils tests (integration only, not E2E)
import '../utils/common-lib.test.js'
import '../utils/common-storage.test.js'
import '../drivers/aws-ssm/aws-ssm-base.test.js'
import '../drivers/aws-ssm/aws-ssm-base-types.test.js'
import '../drivers/aws-ssm/aws-ssm-flex.test.js'
import '../drivers/aws-ssm/aws-ssm-flex-types.test.js'

