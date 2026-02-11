/**
 * AWS DynamoDB Driver Index
 *
 * Exports base driver and driver-specific types and public helpers.
 */

export { default, default as AwsDynamoDBDriver } from './aws-dynamodb.js';
export { default as awsDynamoDBDriver } from './aws-dynamodb.js';

export * from './types.js';
export {
  validateDynamoDBOptions,
  createDynamoClient,
  createDocClient,
  buildDynamoKey,
  resolvePartitionKey,
  getKeysContext,
} from './shared-public.js';
