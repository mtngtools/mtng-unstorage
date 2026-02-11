import awsS3Driver from "../../../src/drivers/aws-s3/aws-s3";
import awsS3FlexDriver from "../../../src/drivers/aws-s3/aws-s3-flex";
import { DriverTestConfig, DriverTestConfigWithOptions } from "../../common/test-driver-config";
import MockS3Client from "../../helpers/mock-s3";

export const awsS3DriverTestConfig: DriverTestConfig = {
    name: 'aws-s3',
    base: awsS3Driver,
    flex: awsS3FlexDriver,
    mockClientOptions: {
        makeMockClient: () => new MockS3Client(),
        clientOptionKey: 's3Client',
    },
    // versioned: awsS3VersionedDriver, // TODO: Add when available
    additionalCoreScenarios: [],
    additionalWriteScenarios: [],
    additionalLimitedScenarios: [],
}

export const awsS3DriverTestConfigWithOptions = {
    ...awsS3DriverTestConfig,
    generateTestDriverOptions: () => ({
        bucket: 'test-bucket',
        storagePrefix: 'test-prefix/',
        allowClear: true,
    }),
} satisfies DriverTestConfigWithOptions;