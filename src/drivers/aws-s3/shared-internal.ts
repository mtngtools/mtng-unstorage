/**
 * Internal S3 Utilities
 * 
 * Internal implementation details not meant for external use.
 */

import { S3Client } from '@aws-sdk/client-s3';

/**
 * Send a HeadObjectCommand to S3 to check for object existence.
 */
export async function getS3Head(client: S3Client, params: { Bucket: string; Key: string; }): Promise<void> {
  const command = new (await import('@aws-sdk/client-s3')).HeadObjectCommand(params);
  await client.send(command);
}

