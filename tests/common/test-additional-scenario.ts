import { it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MultipleItemsTest, SingleItemTest, } from './test-driver-config';
import { createStorage, Driver, Storage } from 'unstorage';
import { AnyPartialDriverOptions, AnyPartialTransactionOptions } from "../../src/drivers/types";

export type AdditionalScenarioBaseTestOptions = {
    driver: (opts?: any) => Driver;
    generateTestDriverOptions?: () => AnyPartialDriverOptions;
    generateTestTransactionOptions?: () => AnyPartialTransactionOptions;
    writer: {
        generateTestDriverOptions?: () => AnyPartialDriverOptions;
        generateTestTransactionOptions?: () => AnyPartialTransactionOptions;
    },
    singleItemTest: SingleItemTest;
    multipleItemsTest: MultipleItemsTest;
}

export type AdditionalScenarioTestParams = AdditionalScenarioBaseTestOptions & {
}

export type AdditionalScenarioTestContext = AdditionalScenarioBaseTestOptions & {
    storage: Storage;
    writerStorage: Storage;
    singleItemTestTransactionOptions: AnyPartialTransactionOptions;
    multipleItemsTestTransactionOptions: AnyPartialTransactionOptions;
};

/**
 * Runs additional scenarios driver. Uses a writer driver for
 * setItem/clear so the reader is only exercised on reads.
 */
export function testAdditionalScenario(opts: AdditionalScenarioTestParams) {
    const ctx = { ...opts } as AdditionalScenarioTestContext;

    ctx.singleItemTestTransactionOptions = {
        ...ctx.generateTestTransactionOptions?.(),
        ...ctx.singleItemTest.writeTransactionOptions,
    };

    ctx.multipleItemsTestTransactionOptions = {
        ...ctx.generateTestTransactionOptions?.(),
        ...ctx.multipleItemsTest.writeTransactionOptions,
    };

    beforeAll(() => {
        ctx.storage = createStorage({ driver: ctx.driver(), ...ctx.generateTestDriverOptions?.() });
        ctx.writerStorage = createStorage({ driver: ctx.driver(), ...ctx.writer.generateTestDriverOptions?.() });
    });

    afterAll(async () => {
        await ctx.storage?.dispose?.();
        await ctx.writerStorage?.dispose?.();
    });

    afterEach(async () => {
        await ctx.writerStorage.clear();
    });

    it('setItem (writer) / getItem (reader)', async () => {
        await ctx.writerStorage.setItem(
            ctx.singleItemTest.writeKey,
            ctx.singleItemTest.value,
            ctx.singleItemTestTransactionOptions
        );
        const returnedValue = await ctx.storage.getItem(
            ctx.singleItemTest.readKey,
            ctx.singleItemTestTransactionOptions
        );
        expect(ctx.singleItemTest.success(returnedValue as Record<string, any>)).toBe(true);
    });

    it('getKeys', async () => {
        for (const item of ctx.multipleItemsTest.items) {
            await ctx.writerStorage.setItem(
                item.writeKey,
                item.value,
                ctx.multipleItemsTestTransactionOptions
            );
        }
        const sortedReadKeys = ctx.multipleItemsTest.items.map((item: any) => item.readKey).sort();
        expect(await ctx.storage.getKeys(
            ctx.multipleItemsTest.readBaseKey,
            ctx.multipleItemsTestTransactionOptions
        ).then((k) => k.sort()))
            .toMatchObject(sortedReadKeys);
    });

    // implement later
    // it.skipIf(opts.noKeysSupport)('getKeys with depth', async () => {
    // });

    it('getItems', async () => {
        for (const item of ctx.multipleItemsTest.items) {
            await ctx.writerStorage.setItem(
                item.writeKey,
                item.value,
                ctx.multipleItemsTestTransactionOptions
            );
        }
        const returnedValue = await ctx.storage.getItems(
            [{ key: ctx.multipleItemsTest.readBaseKey }],
            ctx.multipleItemsTestTransactionOptions
        ) as Record<string, any>[];
        expect(ctx.multipleItemsTest.success(returnedValue)).toBe(true);
    });

}
