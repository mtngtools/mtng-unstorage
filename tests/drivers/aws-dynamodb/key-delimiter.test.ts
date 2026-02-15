
import { describe, it, expect, beforeEach } from 'vitest';
import awsDynamoDBDriver from '../../../src/drivers/aws-dynamodb/aws-dynamodb';
import { MockDynamoDBDocumentClient } from '../../helpers/mock-dynamodb';
// import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'test-table-delimiter';
const PK_NAME = 'pk';

describe('AWS DynamoDB Driver: Key Delimiter', () => {
    beforeEach(() => {
        MockDynamoDBDocumentClient.reset();
    });

    it('should use default delimiter "#"', async () => {
        const docClient = new MockDynamoDBDocumentClient();
        const driver = awsDynamoDBDriver({
            tableName: TABLE_NAME,
            strategy: 'table_pk',
            partitionKeyName: PK_NAME,
            region: 'us-east-1',
            accessKeyId: 'test',
            secretAccessKey: 'test',
            docClient,
            base: 'base',
        }) as any;

        await driver.setItem('foo', 'bar');

        // Verify key in storage
        const result = (await docClient.send({
            constructor: { name: 'GetCommand' },
            input: {
                TableName: TABLE_NAME,
                Key: { [PK_NAME]: 'base#foo' },
            },
        } as any)) as any;

        expect(result.Item).toBeDefined();
        expect(result.Item?.value).toBe('bar');
    });

    it('should use custom delimiter "/"', async () => {
        const docClient = new MockDynamoDBDocumentClient();
        const driver = awsDynamoDBDriver({
            tableName: TABLE_NAME,
            strategy: 'table_pk',
            partitionKeyName: PK_NAME,
            region: 'us-east-1',
            accessKeyId: 'test',
            secretAccessKey: 'test',
            docClient,
            base: 'base',
            keyDelimiter: '/',
        }) as any;

        await driver.setItem('foo', 'bar');

        // Verify key in storage
        const result = (await docClient.send({
            constructor: { name: 'GetCommand' },
            input: {
                TableName: TABLE_NAME,
                Key: { [PK_NAME]: 'base/foo' },
            },
        } as any)) as any;

        expect(result.Item).toBeDefined();
        expect(result.Item?.value).toBe('bar');
    });

    it('should use custom delimiter ":"', async () => {
        const docClient = new MockDynamoDBDocumentClient();
        const driver = awsDynamoDBDriver({
            tableName: TABLE_NAME,
            strategy: 'table_pk',
            partitionKeyName: PK_NAME,
            region: 'us-east-1',
            accessKeyId: 'test',
            secretAccessKey: 'test',
            docClient,
            base: 'base',
            keyDelimiter: ':',
        }) as any;

        await driver.setItem('foo', 'bar');

        // Verify key in storage
        const result = (await docClient.send({
            constructor: { name: 'GetCommand' },
            input: {
                TableName: TABLE_NAME,
                Key: { [PK_NAME]: 'base:foo' },
            },
        } as any)) as any;

        expect(result.Item).toBeDefined();
        expect(result.Item?.value).toBe('bar');
    });

    it('should affect PK-only strategies getKeys prefix handling', async () => {
        const docClient = new MockDynamoDBDocumentClient();
        const driverPK = awsDynamoDBDriver({
            tableName: TABLE_NAME,
            strategy: 'table_pk',
            partitionKeyName: PK_NAME,
            region: 'us-east-1',
            accessKeyId: 'test',
            secretAccessKey: 'test',
            docClient,
            base: 'base',
            keyDelimiter: '/',
        }) as any;

        // Manually put item
        await docClient.send({
            constructor: { name: 'PutCommand' },
            input: {
                TableName: TABLE_NAME,
                Item: { [PK_NAME]: 'base/foo', value: 'bar' },
            },
        } as any);

        const keys = await driverPK.getKeys();
        // The driver implementation of getKeys (native) returns keys that passed the filter.
        // It returns the full key from DynamoDB.
        expect(keys).toContain('base/foo');
    });
});
