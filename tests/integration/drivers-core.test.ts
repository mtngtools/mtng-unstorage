import { describe } from 'vitest'
// TODO: Import testDriver from unstorage - may need to copy from node_modules/unstorage/test/drivers/utils.ts
// or create a local copy in tests/helpers/
import { testDriver as testDriverCore } from '../common/test-driver-default.js'
// import awsS3VersionedDriver from '../../src/drivers/aws-s3/aws-s3-versioned.js' // Future
// import { AWSDDbDriverOptions } from '../../src/drivers/aws-ddb/types.js'
// import awsDdbDriver from '../../src/drivers/aws-ddb/aws-ddb.js'
// import MockDynamoDBDocumentClient from '../helpers/mock-dynamodb.js'
// import { MockSsmClient } from '../helpers/mock-ssm.js' // Future

// Shared test functions for variants
// import { flexCoreTests } from '../variants/flex/flex-core-tests.js'
// import { versionedTests } from '../variants/versioned/versioned-tests.js'
import { DriverTestConfigWithOptions } from '../common/test-driver-config.js'
import { flexCoreTests } from '../variants/flex/flex-core-tests.js'
import { awsDynamoDBDriverTestConfigWithOptions } from '../drivers/aws-dynamodb/aws-dynamodb-test-config.js'
import { awsS3DriverTestConfigWithOptions } from '../drivers/aws-s3/aws-s3-test-config.js'

// Define all drivers
const drivers: DriverTestConfigWithOptions[] = [
  awsS3DriverTestConfigWithOptions,
  awsDynamoDBDriverTestConfigWithOptions,
]


// Test all drivers and variants
drivers.forEach((driverTestConfigWithOptions) => {
  const { name, additionalWriteScenarios } = driverTestConfigWithOptions;
  describe(`DRIVER:${name}`, () => {

    describe('default (full)', () => {
      testAllDriverVariantsCore(driverTestConfigWithOptions)
    }) //end describe 'default (full)'

    additionalWriteScenarios.forEach((scenario) => {
      describe(scenario.name, () => {

        const scenarioTestConfigWithOptions: DriverTestConfigWithOptions = {
          ...driverTestConfigWithOptions,
          generateTestDriverOptions: () => ({
            ...driverTestConfigWithOptions.generateTestDriverOptions(),
            ...scenario.driverOptions,
          }),
        }
        testAllDriverVariantsCore(scenarioTestConfigWithOptions);

      }) //end describe(scenario.name)
    }) //end additionalWriteScenarios.forEach((scenario) => {


  }) //end describe(name)
})

function testAllDriverVariantsCore(driverTestConfigWithOptions: DriverTestConfigWithOptions) {
  const { base, flex, versioned, generateTestDriverOptions, mockClientOptions } = driverTestConfigWithOptions;
  describe('base', () => {
    testDriverCore({
      driver: base,
      generateTestDriverOptions,
      mockClientOptions,
      // additionalTests: undefined,
    })
  }) //end base describe

  if (flex) {
    // Flex variant - base driver tests + flex-specific tests
    describe('flex', () => {
      testDriverCore({
        driver: flex,
        generateTestDriverOptions,
        mockClientOptions,
        additionalTests: flexCoreTests,
      })
    })
  } //end flex

  if (versioned) {
    // Versioned variant - base driver tests + flex tests + version-specific tests
    describe('versioned', () => {
      testDriverCore({
        driver: versioned,
        generateTestDriverOptions,
        mockClientOptions,
        additionalTests: (ctx) => {
          // Versioned includes flex functionality, so run flex tests first
          flexCoreTests(ctx)
          // Then run version-specific tests
          // versionedTests(ctx)
        },
      })
    })
  }
}

