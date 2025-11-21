import { describe } from 'vitest'
// TODO: Import testDriver from unstorage - may need to copy from node_modules/unstorage/test/drivers/utils.ts
// or create a local copy in tests/helpers/
import { testDriver } from '../helpers/test-driver.js'
import awsS3Driver from '../../src/drivers/aws-s3/aws-s3.js'
import awsS3FlexDriver from '../../src/drivers/aws-s3/aws-s3-flex.js'
// import awsS3VersionedDriver from '../../src/drivers/aws-s3/aws-s3-versioned.js' // Future
import { MockS3Client } from '../../tests/helpers/mock-s3.js'
// import { MockDynamodbClient } from '../helpers/mock-dynamodb.js' // Future
// import { MockSsmClient } from '../helpers/mock-ssm.js' // Future

// Shared test functions for variants
import { flexCoreTests } from '../variants/flex/flex-core-tests.js'
import { versionedTests } from '../variants/versioned/versioned-tests.js'

// Driver configuration type
type DriverConfig = {
  name: string
  base: (opts: any) => any
  flex: (opts: any) => any
  versioned: (opts: any) => any
  makeMockClient: () => any
  getDefaultOptions: () => any
}

// Define all drivers
const drivers: DriverConfig[] = [
  {
    name: 'aws-s3',
    base: awsS3Driver,
    flex: awsS3FlexDriver,
    versioned: awsS3Driver, // TODO: Replace with awsS3VersionedDriver when available
    makeMockClient: () => new MockS3Client(),
    getDefaultOptions: () => ({
      bucket: 'test-bucket',
      storagePrefix: 'test-prefix/',
      allowClear: true,
    }),
  },
  // Future drivers:
  // {
  //   name: 'aws-dynamodb',
  //   base: awsDynamodbDriver,
  //   flex: awsDynamodbFlexDriver,
  //   versioned: awsDynamodbVersionedDriver,
  //   makeMockClient: () => new MockDynamodbClient(),
  //   getDefaultOptions: () => ({
  //     table: 'test-table',
  //     allowClear: true,
  //   }),
  // },
  // {
  //   name: 'aws-ssm',
  //   base: awsSsmDriver,
  //   flex: awsSsmFlexDriver,
  //   versioned: awsSsmVersionedDriver,
  //   makeMockClient: () => new MockSsmClient(),
  //   getDefaultOptions: () => ({
  //     prefix: '/test/',
  //     allowClear: true,
  //   }),
  // },
]

// Test all drivers and variants
drivers.forEach(({ name, base, flex, versioned, makeMockClient, getDefaultOptions }) => {
  describe(name, () => {
    const mockClient = makeMockClient()
    const defaultOptions = getDefaultOptions()

    // Base variant - just the base driver with standard testDriver tests
    describe('base', () => {
      testDriver({
        driver: () => base({
          ...defaultOptions,
          s3Client: mockClient, // TODO: Make this generic (client: mockClient)
        }),
      })
    })

    // Flex variant - base driver tests + flex-specific tests
    describe('flex', () => {
      testDriver({
        driver: () => flex({
          ...defaultOptions,
          s3Client: mockClient, // TODO: Make this generic
        }),
        additionalTests: flexCoreTests,
      })
    })

    // Versioned variant - base driver tests + flex tests + version-specific tests
    describe('versioned', () => {
      testDriver({
        driver: () => versioned({
          ...defaultOptions,
          s3Client: mockClient, // TODO: Make this generic
        }),
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

