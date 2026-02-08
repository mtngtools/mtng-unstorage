# Issue: AWS SSM Parameter Store driver (base)

## Title
**feat: Add aws-ssm driver (base) with withDecryption option**

## Description

Add an AWS Systems Manager Parameter Store driver for unstorage (base variant only), modeled after the existing aws-s3 driver and following the spec in `spec/drivers/aws-ssm/README.md`.

### Scope
- Base driver only (no aws-ssm-flex in this issue).
- Driver and request option: `withDecryption` (default `true`) for GetParameter / GetParametersByPath.

### Deliverables
- [ ] Driver implementation: `src/drivers/aws-ssm/` (types, shared-public, shared-internal, aws-ssm.ts, index)
- [ ] Package and build: package.json, vite.config.ts, src/index.ts exports
- [ ] Spec: `spec/drivers/aws-ssm/README.md` (config, behavior, withDecryption)
- [ ] Tests: shared base/provider tests support configurable client key; mock-ssm; aws-ssm-base and aws-ssm-base-types; integration/e2e entries
- [ ] withDecryption: driver option and request option (MTSSMDriverTransactionOptions), default true

### References
- Spec: `spec/drivers/aws-ssm/README.md`
- Model: `src/drivers/aws-s3` (base driver)
