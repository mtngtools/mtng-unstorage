/**
 * AWS SSM driver types index
 *
 * Re-exports base and flex types.
 */

export type {
  SharedAwsSsmDriverOptions,
  AwsSsmDriverOptions,
  PartialAwsSsmDriverOptions,
  ResolvedAwsSsmDriverOptions,
  ResolvedAWSSSMDriverOptions,
  MTSSMDriverTransactionOptions,
  PartialMTSSMDriverTransactionOptions,
  ConditionalDriver
} from './types-base.js';

export { AWS_SSM_DRIVER_NAME } from './types-base.js';

export type { 
  AwsSsmFlexDriverOptions, 
  PartialAwsSsmFlexDriverOptions,
  ResolvedAwsSsmFlexDriverOptions 
} from './types-flex.js';
export { AWS_SSM_FLEX_DRIVER_NAME } from './types-flex.js';
