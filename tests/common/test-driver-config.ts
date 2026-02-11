import { createStorage, Driver, Storage } from "unstorage";
import { AnyPartialDriverOptions, AnyPartialTransactionOptions } from "../../src/drivers/types";


export type Scenario = {
  name: string;
  driverOptions?: AnyPartialDriverOptions;
  transactionOptions?: AnyPartialTransactionOptions;
}

export type SingleItemTest = {
  writeKey: string;
  readKey: string;
  writeTransactionOptions?: AnyPartialTransactionOptions;
  readTransactionOptions?: AnyPartialTransactionOptions;
  value: Record<string, any>;
  success: (returnedObject: Record<string, any>) => boolean;
}

export type MultipleItemsTest = {
  items: SingleItemTest[];
  readBaseKey: string;
  writeTransactionOptions?: AnyPartialTransactionOptions;
  readTransactionOptions?: AnyPartialTransactionOptions;
  success: (returnedObjects: Record<string, any>[]) => boolean;
}

export type WriterScenarioOptions = Scenario & {
};

export type AdditionalScenario = Scenario & {
  writer: WriterScenarioOptions;
  singleItemTest: SingleItemTest;
  multipleItemsTest: MultipleItemsTest;
  // additionalTests?: (ctx: TestAdditionalScenarioContext) => void; //PLANNED FOR LATER
}

export type MockClientOptions = {
  makeMockClient: () => any
  clientOptionKey: string
}

// Driver configuration type
export type DriverTestConfig = {
  name: string
  base: (opts: any) => any
  flex?: (opts: any) => any
  versioned?: (opts: any) => any
  mockClientOptions?: MockClientOptions
  additionalCoreScenarios: Scenario[];
  additionalWriteScenarios: WriterScenarioOptions[];
  additionalLimitedScenarios: AdditionalScenario[];
}

export type DriverTestConfigWithOptions = DriverTestConfig & {
  generateTestDriverOptions: () => AnyPartialDriverOptions,
}


type BaseTestOptions = {
  driver: (opts?: any) => Driver;
  generateTestDriverOptions?: () => any;
  mockClientOptions?: MockClientOptions;
  noKeysSupport?: boolean;
}

export type MTTestContext = BaseTestOptions & {
  storage: Storage;
  mockClient?: any;
};

export type MTTestOptions = BaseTestOptions & {
  additionalTests?: (ctx: MTTestContext) => void;
}

export function maybeMakeMockClient({ mockClientOptions }: { mockClientOptions?: MockClientOptions }) {
  if (mockClientOptions) {
    const mockClient = mockClientOptions.makeMockClient();
    const clientDriverOptions = { [mockClientOptions.clientOptionKey]: mockClient };
    return { clientDriverOptions: clientDriverOptions, mockClient };
  } else {
    return { clientDriverOptions: {}, mockClient: undefined };
  }
}

export function beforeAllSetupCtx(ctx: MTTestContext, testOpts: MTTestOptions) {
  ctx.driver = testOpts.driver;
  const { clientDriverOptions, mockClient } = maybeMakeMockClient(testOpts);
  ctx.mockClient = mockClient;
  ctx.storage = createStorage({
    driver: ctx.driver({
      ...testOpts.generateTestDriverOptions?.(),
      ...clientDriverOptions,
    })
  });
}

export async function afterAllSetupCtx(ctx: MTTestContext) {
  await ctx.storage?.dispose?.();
}

export async function afterEachSetupCtx(ctx: MTTestContext) {
  await ctx.mockClient?.reset?.();
  await ctx.mockClient?.dispose?.();
  await ctx.storage?.dispose?.();
}