import { DriverTestConfig, DriverTestConfigWithOptions } from "../../common/test-driver-config";
import awsDynamoDBDriver from "../../../src/drivers/aws-dynamodb/aws-dynamodb";
import { MockDynamoDBDocumentClient } from "../../helpers/mock-dynamodb";

export const TABLE_PK_SK = 'test-table-pksk';
export const TABLE_PK = 'test-table-pk';
export const LSI_NAME = 'test-lsi';
export const GSI_NAME = 'test-gsi';

export const PARTITION_KEY_NAME = 'pk';
export const SORT_KEY_NAME = 'sk';
export const LSI_SORT_KEY_NAME = 'lsk';  // Local Secondary Index Sort Key Name
export const GSI_PARTITION_KEY_NAME = 'gpk';  // Global Secondary Index Partition Key Name
export const GSI_SORT_KEY_NAME = 'gsk';  // Global Secondary Index Sort Key Name

export const PK_VALUE = 'pk-testing';
export const SK_VALUE = 'sk-testing';
export const LSK_VALUE = 'lsk-testing';
export const GPK_VALUE = 'gpk-testing';
export const GSK_VALUE = 'gsk-testing';




export const awsDynamoDBDriverTestConfig: DriverTestConfig = {
    name: 'aws-dynamodb',
    base: awsDynamoDBDriver,
    // flex: awsS3FlexDriver,
    mockClientOptions: {
        makeMockClient: () => new MockDynamoDBDocumentClient(),
        clientOptionKey: 'docClient',
    },
    additionalCoreScenarios: [],
    additionalWriteScenarios: [],
    additionalLimitedScenarios: [],
}

export const awsDynamoDBDriverTestConfigWithOptions = {
    ...awsDynamoDBDriverTestConfig,
    generateTestDriverOptions: () => ({
        region: 'us-east-1',
        tableName: TABLE_PK_SK,
        allowClear: true,
        partitionKeyValue: PK_VALUE,
    }),
} satisfies DriverTestConfigWithOptions;


// const WritableScenarios: WritableScenario[] = [
//   {
//     name: 'table_pk_sk',
//     driverOptions: {
//       ...commonWritableOptions,
//       tableName: TABLE_PK_SK,
//     },
//   },
//   {
//     name: 'table_pk_only',
//     driverOptions: {
//       strategy: 'table_pk',
//       ...commonWritableOptions,
//       tableName: TABLE_PK,
//     },
//   },
// ];
