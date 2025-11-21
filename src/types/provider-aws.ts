/**
 * AWS provider-specific types
 * 
 * This file contains generic AWS types that are not specific to a particular
 * AWS service (S3, DynamoDB, SSM, etc.), but are shared across AWS providers.
 */

/**
 * AWS region and inline credential options shared across drivers.
 *
 * Rules (with exactOptionalPropertyTypes in mind):
 * - Either provide both accessKeyId and secretAccessKey (sessionToken optional),
 *   or provide none of the three.
 * - Supplying only one of the pair is disallowed.
 * - Supplying sessionToken without the pair is disallowed.
 */
export type AwsRegionAndCredentials = {
  /** Optional AWS region used when constructing an internal client */
  region?: string;
} & (
  | {
      accessKeyId: string;
      secretAccessKey: string;
      /** Optional session token for temporary credentials */
      sessionToken?: string;
    }
  | {
      accessKeyId?: never;
      secretAccessKey?: never;
      sessionToken?: never;
    }
);

