import { describe } from 'vitest'
// TODO: Import testDriver from unstorage - may need to copy from node_modules/unstorage/test/drivers/utils.ts
// or create a local copy in tests/helpers/
import { testDriver } from '../helpers/test-driver.js'
import { S3Client } from '@aws-sdk/client-s3'
import awsS3Driver from '../../src/drivers/aws-s3/aws-s3.js'
import awsS3FlexDriver from '../../src/drivers/aws-s3/aws-s3-flex.js'
// import awsS3VersionedDriver from '../../src/drivers/aws-s3/aws-s3-versioned.js' // Future
// import { DynamodbClient } from '@aws-sdk/client-dynamodb' // Future
// import { SsmClient } from '@aws-sdk/client-ssm' // Future

// Shared test functions for variants
import { flexCoreTests } from '../variants/flex/flex-core-tests.js'
import { versionedTests } from '../variants/versioned/versioned-tests.js'

// Driver configuration type for E2E
type E2EDriverConfig = {
  name: string
  base: (opts: any) => any
  flex: (opts: any) => any
  versioned: (opts: any) => any
  makeClient: () => any
  getDefaultOptions: (client: any) => any
  isE2EEnabled: () => boolean
}

// Check if E2E is enabled
const isE2EEnabled = process.env.AWS_S3_E2E_ENABLED === 'true'

// Define all drivers
const drivers: E2EDriverConfig[] = [
  {
    name: 'aws-s3',
    base: awsS3Driver,
    flex: awsS3FlexDriver,
    versioned: awsS3Driver, // TODO: Replace with awsS3VersionedDriver when available
    makeClient: () => {
      const region = process.env.AWS_REGION
      return new S3Client({ region })
    },
    getDefaultOptions: (client) => ({
      s3Client: client,
      bucket: process.env.AWS_S3_TEST_BUCKET || 'test-bucket-not-set',
      storagePrefix: process.env.AWS_S3_TEST_PREFIX || 'test-mtng-unstorage-e2e/',
      allowClear: true,
    }),
    isE2EEnabled: () => isE2EEnabled,
  },
  // Future drivers:
  // {
  //   name: 'aws-dynamodb',
  //   base: awsDynamodbDriver,
  //   flex: awsDynamodbFlexDriver,
  //   versioned: awsDynamodbVersionedDriver,
  //   makeClient: () => {
  //     const region = process.env.AWS_REGION
  //     return new DynamodbClient({ region })
  //   },
  //   getDefaultOptions: (client) => ({
  //     dynamodbClient: client,
  //     table: process.env.AWS_DYNAMODB_TEST_TABLE || 'test-table-not-set',
  //     allowClear: true,
  //   }),
  //   isE2EEnabled: () => process.env.AWS_DYNAMODB_E2E_ENABLED === 'true',
  // },
]

// Test all drivers and variants
drivers.forEach(({ name, base, flex, versioned, makeClient, getDefaultOptions, isE2EEnabled }) => {
  const d = isE2EEnabled() ? describe : describe.skip

  d(name, () => {
    const client = makeClient()
    const defaultOptions = getDefaultOptions(client)

    // Base variant - just the base driver with standard testDriver tests
    describe('base', () => {
      testDriver({
        driver: () => base(defaultOptions),
      })
    })

    // Flex variant - base driver tests + flex-specific tests
    describe('flex', () => {
      testDriver({
        driver: () => flex(defaultOptions),
        additionalTests: flexCoreTests,
      })
    })

    // Versioned variant - base driver tests + flex tests + version-specific tests
    describe('versioned', () => {
      testDriver({
        driver: () => versioned(defaultOptions),
        additionalTests: (ctx) => {
          // Versioned includes flex functionality, so run flex tests first
          flexCoreTests(ctx)
          // Then run version-specific tests
          versionedTests(ctx)
        },
      })
    })
  })
})

