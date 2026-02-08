/**
 * AWS SSM driver types index
 *
 * Re-exports base types only (no flex/versioned for aws-ssm to start).
 */

export type {
  SharedAwsSsmDriverOptions,
  AwsSsmDriverOptions,
  ResolvedAwsSsmDriverOptions,
  ResolvedAWSSSMDriverOptions,
  MTSSMDriverTransactionOptions,
  ConditionalDriver
} from './types-base.js';

export { AWS_SSM_DRIVER_NAME } from './types-base.js';
