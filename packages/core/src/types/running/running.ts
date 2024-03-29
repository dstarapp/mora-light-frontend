import { Principal } from '@dfinity/principal';
import { IdentityPool, ValuePool } from './pool';
import {
    ValueItem,
    findInnerValueItemsByLightCore,
    findOuterValueItemsByLightCore,
    getValueItem,
} from './value';
import { LightCore } from '../core';
import { StringResult, deepClone, isSame } from '../common';
import { CandidValue, findChildTypeAndValue } from '../candid';
import { doTransform } from '../transform';
import { DataTransmit, doTransmitShow } from '../transmit';

export type LightCoreData = {
    id: string;
    info_json: string;
    created: bigint;
    creator: Principal;
    core_json: string;
    hash: string;
    audited: bigint;
    auditor: Principal;
    updated: bigint;
};

export type ComponentStatus =
    | 'preview' // preview status, just ui for user
    | 'using' // using status, author must make sure all arguments is completed
    | 'completed' // using status, and all arguments are done
    | 'running'; // running status

type LightData = {
    key: string; // for identity
    data: LightCoreData; // all data
    core: LightCore; // light data
    prop: ValuePool; // prop source
    inner: ValuePool; // inner source
    runtime: StringResult<CandidValue>; // last runtime result
    last: number; // last refresh time
};

export class LightsRunning {
    private next_subscribe_id = 1;

    private lights: LightData[]; // light data

    private parentOuterValues: ValueItem[];
    private outerValues: ValueItem[][];

    private outerPool: ValuePool;

    private identifyPool: IdentityPool;

    constructor(first?: { key: string; data: LightCoreData; prop: ValuePool }) {
        this.next_subscribe_id = 1;
        this.lights = [];
        this.parentOuterValues = [];
        this.outerValues = [];
        this.outerPool = new ValuePool();
        this.identifyPool = new IdentityPool();
        if (first) {
            this.insert(0, first.key, first.data, first.prop);
        }
    }

    public copyLights(): LightsRunning {
        const running = new LightsRunning();
        for (let i = 0; i < this.size(); i++) {
            const data = this.getLightData(i)!;
            running.push(data.key, data.data, data.prop);
        }
        return running;
    }

    public size(): number {
        return this.lights.length;
    }

    // refresh after every modify
    public refresh() {
        // 1. check outer values
        this.refreshOuterValues();
        // 2. check value pools
        this.refreshPools();
    }

    private refreshOuterValues(): void {
        const result: ValueItem[][] = [];

        let last: ValueItem[] = [];

        result[0] = [...last];

        for (let i = 1; i < this.lights.length; i++) {
            const light = this.lights[i - 1]; // * get last light

            last.push(
                ...findOuterValueItemsByLightCore(light.core, { propValues: light.prop.values() }),
            );

            result[i] = [...last];
        }

        // if (result.length !== 1 || result[0].length !== 0)
        //     console.error("running outerValues", result); // debug

        this.outerValues = result;
    }

    private refreshPools(): void {
        // update outer value pool
        const valueItems: ValueItem[] = [...this.parentOuterValues];
        for (let i = 0; i < this.lights.length; i++) {
            const light = this.lights[i];
            valueItems.push(
                ...findOuterValueItemsByLightCore(light.core, { propValues: light.prop.values() }),
            );
        }
        const values = this.outerPool.getAllValues();
        const actions = this.outerPool.getAllActions();
        const identifiers = this.outerPool.getAllIdentifiers();
        this.outerPool = new ValuePool();
        for (const value of valueItems) {
            this.outerPool.init(
                getValueItem(value, values[value.name]),
                actions[value.name] ?? [],
                identifiers[value.name],
            );
        }

        // console.error("init outer pool", this.outerPool);

        // update every inner value pool
        for (let i = 0; i < this.lights.length; i++) {
            const light = this.lights[i];

            const items = findInnerValueItemsByLightCore(light.core, {
                propValues: light.prop.values(),
            });

            const values = light.inner.getAllValues();
            const actions = light.inner.getAllActions();
            const identifiers = light.inner.getAllIdentifiers();
            light.inner = new ValuePool();
            for (const value of items) {
                light.inner.init(
                    getValueItem(value, values[value.name]),
                    actions[value.name] ?? [],
                    identifiers[value.name],
                );
            }
            // console.error("init inner pool", innerPool);
        }
    }

    public setParentOuterValues(parentOuterValues: ValueItem[]) {
        this.parentOuterValues = [...parentOuterValues];
        this.refresh();
    }

    public getFinalOuterValues(): ValueItem[] {
        return this.outerValues.length ? [...this.outerValues[this.outerValues.length - 1]] : [];
    }

    public setOuterPool(outerPool: ValuePool) {
        this.outerPool = outerPool;
    }

    public insert(i: number, key: string, data: LightCoreData, prop: ValuePool) {
        if (i < 0 || this.lights.length < i) return;

        data = deepClone(data); // copy

        const inner = new ValuePool();
        const lightData: LightData = {
            key,
            data,
            core: JSON.parse(data.core_json),
            prop,
            inner,
            runtime: { err: 'initial...' },
            last: 0,
        };

        if (this.lights.length === i) {
            this.lights.push(lightData);
        } else {
            this.lights.splice(i, 0, lightData);
        }

        this.refresh();
    }

    public push(key: string, data: LightCoreData, prop: ValuePool) {
        this.insert(this.lights.length, key, data, prop);
    }

    public delete(i: number) {
        if (i < 0 || this.lights.length <= i) return;

        this.lights.splice(i, 1);

        this.refresh();
    }

    public getLightKey(i: number): string {
        if (i < 0 || this.lights.length <= i) throw new Error('what a index? ' + i);

        return this.lights[i].key;
    }

    public getLightCoreData(i: number): LightCoreData | undefined {
        if (i < 0 || this.lights.length <= i) {
            // console.error("what a index? ", i, this);
            return undefined;
        }
        return this.lights[i].data;
    }

    public getLightCore(i: number): LightCore | undefined {
        if (i < 0 || this.lights.length <= i) {
            // console.error("what a index? ", i, this);
            return undefined;
        }
        return this.lights[i].core;
    }

    private getLightData(i: number): LightData | undefined {
        if (i < 0 || this.lights.length <= i) {
            // console.error("what a index? ", i, this);
            return undefined;
        }
        return this.lights[i];
    }

    public getOuterValues(i: number): ValueItem[] | undefined {
        if (i < 0 || this.lights.length <= i) {
            // console.error("what a index? ", i, this);
            return undefined;
        }

        return this.outerValues[i];
    }

    public getOuterPool(): ValuePool {
        return this.outerPool;
    }

    public getPropPool(i: number): ValuePool | undefined {
        if (i < 0 || this.lights.length <= i) {
            // console.error("what a index? ", i, this);
            return undefined;
        }

        return this.lights[i].prop;
    }

    public getInnerPool(i: number): ValuePool | undefined {
        if (i < 0 || this.lights.length <= i) {
            // console.error("what a index? ", i, this);
            return undefined;
        }

        return this.lights[i].inner;
    }

    public getIdentityPool(): IdentityPool {
        return this.identifyPool;
    }

    public getNextSubscribeId(): number {
        const id = this.next_subscribe_id;
        this.next_subscribe_id++;
        return id;
    }

    // try to run if there is changed
    public async pulse(
        i: number,
        canisters: number,
        trigger: string,
        running: boolean,
        receive?: (_: StringResult<CandidValue>) => Promise<void>,
    ): Promise<string> {
        if (i < 0 || this.lights.length <= i) {
            // console.error("what a index? ", i, this);
            return `wrong index ${i}, size of lights is ${this.size()}.`;
        }

        const light = this.getLightCore(i)!;
        const lightData = this.getLightData(i)!;
        const outerPool = this.getOuterPool();

        // console.error("pulse light", i, light, JSON.stringify(light));

        // 1. try to fetch value of data source
        let runtimeResult: StringResult<CandidValue> | undefined = (() => {
            if (canisters === 0 && trigger) {
                // console.error('has trigger requirement:', canisters, trigger);
                return { err: trigger };
            }
            let runtime: CandidValue[] | undefined = [];
            for (let i = 0; i < light.data.length; i++) {
                const r = light.data[i].runtime;
                // console.error("running pulse data source", i, r);
                if (r === undefined) {
                    runtime = undefined;
                    break;
                }
                if (r.err !== undefined) {
                    return r; // error message
                }
                runtime[i] = r.ok; // fetch value is exist
            }
            if (runtime !== undefined) return { ok: runtime }; // return value if exist
            return undefined;
        })();

        // console.error('check 1', runtimeResult, this);

        // 2. wrap real value
        const old = lightData.runtime;
        if (runtimeResult === undefined) {
            // must have a result
            if (old.err !== undefined) {
                runtimeResult = old; // last result
            } else {
                runtimeResult = { err: 'no data' }; // there is no last result
            }
        }

        // console.error("check 2", old, "->", runtimeResult, this);

        // 3. check same value or not
        if (isSame(old, runtimeResult)) {
            // console.log(`No.${i} got light value same`, lightData.runtime, runtimeResult, this);
            // do not pulse if same value
            return `same with last time: ${
                runtimeResult !== undefined ? JSON.stringify(runtimeResult) : 'undefined'
            }`;
        }

        // console.error("check 3", old, "->", runtimeResult, this);

        // 4. save current value
        lightData.runtime = deepClone(runtimeResult); // save current value
        lightData.last = new Date().getTime(); // update last time

        // console.error("check 4", lightData.runtime, lightData.last);

        const doTransmitError = async (
            transmits: DataTransmit[],
            runtime: {
                ok?: undefined;
                err: string;
            },
        ) => {
            for (let i = 0; i < transmits.length; i++) {
                const transmit = transmits[i];
                switch (transmit.transmit) {
                    case 'outer':
                        outerPool.pulse(transmit.exported.name, runtime); // try to export
                        break;
                    case 'show':
                        await doTransmitShow(transmit, runtime, running);
                        break;
                }
            }
        };

        // 5. if current value is undefined, cancel previous value
        if (runtimeResult.err !== undefined) {
            console.log(`No.${i} got light value undefined`, runtimeResult, light);
            await doTransmitError(light.transmits, runtimeResult); // transmit error
            return '';
        }

        // 6. do transform
        runtimeResult = await doTransform(light.transform, deepClone(runtimeResult.ok), running); // deep copy
        if (runtimeResult.err !== undefined) {
            console.error(`No.${i} transform failed`, runtimeResult, light);
            await doTransmitError(light.transmits, runtimeResult); // transmit error
            return '';
        }

        // 7. callback
        if (receive !== undefined) receive(deepClone(runtimeResult));

        console.log(`No.${i} got light value`, runtimeResult, light);

        // 8. do transmits
        const transmits = light.transmits;
        for (let i = 0; i < transmits.length; i++) {
            const transmit = transmits[i];
            let value: CandidValue = deepClone(runtimeResult.ok); // deep copy
            switch (transmit.transmit) {
                case 'outer':
                    // 1. fetch child value
                    let { value: child } = findChildTypeAndValue(
                        value,
                        transmit.from,
                        transmit.child,
                    );

                    // 2. do transform
                    const transformResult = await doTransform(transmit.transform, child, running);

                    // 3. try to export
                    outerPool.pulse(transmit.exported.name, transformResult);
                    break;
                case 'show':
                    await doTransmitShow(transmit, { ok: value }, running);
                    break;
            }
        }

        return '';
    }

    public clean(i: number) {
        const lightData = this.getLightData(i)!;
        lightData.runtime = { err: 'no data: ' + new Date().getTime() };
    }
}
