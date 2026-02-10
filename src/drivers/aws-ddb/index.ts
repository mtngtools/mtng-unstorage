/**
 * AWS DynamoDB Driver Index
 *
 * Exports base driver and driver-specific types and public helpers.
 */

export { default, default as AwsDdbDriver } from './aws-ddb.js';
export { default as awsDdbDriver } from './aws-ddb.js';

export * from './types.js';
export {
  validateDdbOptions,
  createDynamoClient,
  createDocClient,
  buildDynamoKey,
  resolvePartitionKey,
  getKeysContext,
} from './shared-public.js';
