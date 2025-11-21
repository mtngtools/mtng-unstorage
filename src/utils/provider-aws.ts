/**
 * AWS provider-specific utilities
 * 
 * This file contains utilities specific to AWS providers (S3, DynamoDB, SSM, etc.).
 */

import type { AwsRegionAndCredentials } from '../types/index.js';

/**
 * Validates AWS region and credentials.
 * Returns a sanitized version of the input options.
 */
export function validateAWSRegionAndCredentials(
  opts: AwsRegionAndCredentials
): AwsRegionAndCredentials {
  
  return {
    ...(opts.region ? { region: opts.region } : {}),
    ...(opts.accessKeyId ? { accessKeyId: opts.accessKeyId } : {}),
    ...(opts.secretAccessKey ? { secretAccessKey: opts.secretAccessKey } : {}),
    ...(opts.sessionToken ? { sessionToken: opts.sessionToken } : {}),
  } as AwsRegionAndCredentials;
}

