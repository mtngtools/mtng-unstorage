import { PartialAwsS3DriverOptions } from "../aws-s3/types/types-base.js";
import { PartialAwsSsmDriverOptions, PartialMTSSMDriverTransactionOptions } from "../aws-ssm/types/types-base.js";
import { PartialAWSDDbDriverOptions, PartialMTDdbDriverTransactionOptions } from "../aws-ddb/types/types-base.js";
import { MTBaseDriverOptions, MTBaseDriverTransactionOptions } from "../../types/driver-base.js";

export type AnyPartialDriverOptions = Partial<MTBaseDriverOptions> 
    | PartialAwsS3DriverOptions 
    | PartialAwsSsmDriverOptions 
    | PartialAWSDDbDriverOptions;
export type AnyPartialTransactionOptions = Partial<MTBaseDriverTransactionOptions> 
    | PartialMTSSMDriverTransactionOptions 
    | PartialMTDdbDriverTransactionOptions;