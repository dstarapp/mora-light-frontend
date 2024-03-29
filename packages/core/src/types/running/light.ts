import { CandidValue } from '../candid';
import { StringResult } from '../common';
import { CanisterIdentity, SupportedDataSource } from '../source';
import { IdentityPool, ValuePool } from './pool';
import { ValueItem } from './value';

export type RunningLight = {
    getNextSubscribeId: () => number;
    propPool: ValuePool;
    outerPool: ValuePool;
    innerPool: ValuePool;
    identityPool: IdentityPool;

    getNextSourceId: () => number;
    sources: SourcesManager;
    refreshSources: () => void;

    canisters: CanisterManager;

    trigger: string;
    refreshTrigger: () => void;

    calling: number;
    callingStates: Record<string, CallingState>;
    refreshCalling: () => void;

    finalOuterValue: ValueItem[];
};

export type SourceState = {
    id: string;
    source: SupportedDataSource;
    children: string[];
    el?: HTMLElement;
    canister_id?: StringResult<string>;
    arg?: StringResult<CandidValue>;
    identity?: StringResult<CanisterIdentity>;
    result?: StringResult<CandidValue>;
    clean?: () => void;
};

export class SourcesManager {
    private records: Record<string, SourceState>;

    constructor() {
        this.records = {};
    }

    public size(): number {
        return Object.keys(this.records).length;
    }

    private append(parentId: number, sourceId: number) {
        const item = this.records[parentId];
        if (item === undefined) return;
        if (!item.children.includes(`${sourceId}`)) item.children.push(`${sourceId}`);
    }

    public init(
        parentId: number,
        sourceId: number,
        source: SupportedDataSource,
        clean?: () => void,
    ) {
        this.append(parentId, sourceId);
        this.records[sourceId] = { id: `${sourceId}`, source, children: [] };
        if (clean) this.records[sourceId].clean = clean;
    }

    public updateEl(sourceId: number, el: HTMLElement) {
        const item = this.records[sourceId];
        if (item !== undefined) item.el = el;
    }

    public updateCanisterId(sourceId: number, canister_id: StringResult<string> | undefined) {
        const item = this.records[sourceId];
        if (item !== undefined) item.canister_id = canister_id;
    }

    public updateArg(sourceId: number, arg: StringResult<CandidValue> | undefined) {
        const item = this.records[sourceId];
        if (item !== undefined) item.arg = arg;
    }

    public updateIdentity(sourceId: number, identity: StringResult<CanisterIdentity> | undefined) {
        const item = this.records[sourceId];
        if (item !== undefined) item.identity = identity;
    }

    public updateResult(sourceId: number, result: StringResult<CandidValue> | undefined) {
        const item = this.records[sourceId];
        if (item !== undefined) item.result = result;
    }

    public remove(parentId: number, sourceId: number) {
        const item = this.records[parentId];
        if (item !== undefined) {
            const index = item.children.indexOf(`${sourceId}`);
            if (index >= 0) item.children.splice(index, 1);
        }
        delete this.records[sourceId];
    }

    public isReady(): boolean {
        // console.error('source manager', this.records);
        const checkSourceReady = (key: string): boolean => {
            // console.error('source manager isReady', key);
            const item: SourceState = this.records[key];
            const checkByArgAndChildren = (): boolean => {
                if (item.arg === undefined) return false;
                if (item.arg.err !== undefined) {
                    const children = this.records[key].children;
                    if (children.length === 0) return false;
                    for (const k of children) {
                        if (!checkSourceReady(k)) return false;
                    }
                }
                return true;
            };
            switch (item.source) {
                case 'light':
                    // if (!checkByArgAndChildren()) return false;
                    break;
                case 'combined':
                    // if (!checkByArgAndChildren()) return false;
                    break;
                case 'canister':
                    if (item.canister_id === undefined) return false;
                    if (item.canister_id.err !== undefined) return false;
                    // if (!checkByArgAndChildren()) return false;
                    if (item.identity === undefined) return false;
                    if (item.identity.err !== undefined) return false;
                    break;
                case 'input':
                    if (item.result === undefined) return false;
                    if (item.result.err !== undefined) return false;
                    break;
                case 'constant':
                    break;
                case 'inner':
                    break;
                case 'prop':
                    break;
                case 'outer':
                    break;
            }
            return true;
        };

        const keys = Object.keys(this.records);
        for (const key of keys) {
            if (!checkSourceReady(key)) return false;
        }
        return true;
    }

    public clean() {
        const keys = Object.keys(this.records);
        for (const key of keys) {
            const item: SourceState = this.records[key];
            switch (item.source) {
                case 'light':
                    break;
                case 'combined':
                    break;
                case 'canister':
                    item.result = undefined;
                    break;
                case 'input':
                    break;
                case 'constant':
                    break;
                case 'inner':
                    break;
                case 'prop':
                    break;
                case 'outer':
                    break;
            }
            if (item.clean) item.clean();
        }
    }

    public isChildrenReady(sourceId: number): boolean {
        const item = this.records[sourceId];
        if (item === undefined) return true;
        const children = item.children;
        if (children.length === 0) return true;
        for (const id of children) {
            const item = this.records[id];
            if (item.result === undefined) return false;
        }
        return true;
    }
}

export class CanisterManager {
    private _canisters: number[];
    private _triggers: number[];
    constructor() {
        this._canisters = [];
        this._triggers = [];
    }
    public copy(): CanisterManager {
        const manager = new CanisterManager();
        manager._canisters = [...this._canisters];
        manager._triggers = [...this._triggers];
        return manager;
    }
    public canisters(): number {
        return this._canisters.length;
    }
    public add(canister: number) {
        this.delete(canister);
        this._canisters.push(canister);
    }
    public delete(canister: number) {
        this._canisters = this._canisters.filter((c) => c !== canister);
    }
    public trigger() {
        this._triggers = [...this._canisters];
    }
    public triggers(): number {
        return this._triggers.length;
    }
    public hasTrigger(trigger: number): boolean {
        return this._triggers.includes(trigger);
    }
    public done(trigger: number) {
        // console.error('done trigger', trigger);
        this._triggers = this._triggers.filter((c) => c !== trigger);
    }
}

export type CallingState = {
    id: number;
    canisterId: string;
    method: string;
    start: number;
};
