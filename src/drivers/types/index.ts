import { PartialAwsS3DriverOptions } from "../aws-s3/types/types-base.js";
import { PartialAwsSsmDriverOptions, PartialMTSSMDriverTransactionOptions } from "../aws-ssm/types/types-base.js";
import { PartialAwsDynamoDBDriverOptions, PartialAwsDynamoDBDriverTransactionOptions } from "../aws-dynamodb/types/types-base.js";
import { MTBaseDriverOptions, MTBaseDriverTransactionOptions } from "../../types/driver-base.js";

export type AnyPartialDriverOptions = Partial<MTBaseDriverOptions>
    | PartialAwsS3DriverOptions
    | PartialAwsSsmDriverOptions
    | PartialAwsDynamoDBDriverOptions;
export type AnyPartialTransactionOptions = Partial<MTBaseDriverTransactionOptions>
    | PartialMTSSMDriverTransactionOptions
    | PartialAwsDynamoDBDriverTransactionOptions;