import { ActorIdentity, IdentitySource } from '../candid';
import { StringResult, isSame } from '../common';
import { ValueItem, ValueItemValue, isSameValueItemType } from './value';

// transport value pool
export class ValuePool {
    private pool: Record<
        string,
        { value?: ValueItem; actions: { id: number; action: () => void }[] }
    >;

    constructor() {
        this.pool = {};
    }

    public unsubscribe(id: number): void {
        // console.error("unsubscribe", id);

        for (const name of Object.keys(this.pool)) {
            const actions = this.pool[name].actions;
            for (let i = actions.length - 1; 0 <= i; i--) {
                if (actions[i].id === id) actions.splice(i, 1);
            }
        }
    }

    public subscribe(name: string | undefined, id: number, action: () => void) {
        if (!name) return; // undefined and empty are ignored

        // console.error("subscribe", name, id);

        const item = this.pool[name] ?? { actions: [] };
        item.actions.push({ id, action });
        this.pool[name] = item;
    }

    public move(nv: string, ov: string, identifier: number | undefined) {
        // move if has previous value
        const item = this.pool[ov];
        if (item === undefined) return;
        delete this.pool[ov];
        if (item.value) {
            item.value.name = nv;
            if (identifier !== undefined) item.value.identifier = identifier;
        }
        this.pool[nv] = item;
    }

    public findValue(name: string): StringResult<ValueItemValue> | undefined {
        return this.pool[name]?.value?.extra.runtime;
    }

    public findIdentifier(name: string): number | undefined {
        return this.pool[name]?.value?.identifier;
    }

    public pulse(
        name: string | undefined,
        value: StringResult<ValueItemValue> | undefined,
        identifier?: number,
    ) {
        if (!name) return; // undefined and empty are ignored

        // console.error('pulse', name, value, identifier, this.pool);

        const item = this.pool[name];
        if (!item) return;
        if (!item.value) return;
        const old = item.value.extra.runtime;

        // console.error("pulse", name, old, "->", value);

        if (identifier !== undefined) {
            item.value.identifier = identifier;
        }

        if (!isSame(old, value)) {
            // console.error("pulse", item.actions);
            // trigger on different
            item.value.extra.runtime = value;
            item.actions.forEach((action) => action.action());
        }
    }

    public init(
        value: ValueItem,
        actions: { id: number; action: () => void }[],
        identifier: number | undefined,
    ) {
        const newItem = { value, actions };
        const item = this.pool[value.name];
        if (!item?.value || !isSameValueItemType(item.value, newItem.value))
            this.pool[value.name] = newItem;
        // console.error("pool init", value);
        // add listener
        for (const action of actions) {
            const index = this.pool[value.name].actions.findIndex((a) => a.id === action.id);
            if (index < 0) this.pool[value.name].actions.push(action);
        }
        // add identifier
        if (identifier !== undefined) this.pool[value.name].value!.identifier = identifier;
    }

    public getAllValues(): Record<string, ValueItem | undefined> {
        const record: Record<string, ValueItem | undefined> = {};
        for (const key of Object.keys(this.pool)) record[key] = this.pool[key].value;
        return record;
    }

    public getAllActions(): Record<string, { id: number; action: () => void }[]> {
        const record: Record<string, { id: number; action: () => void }[]> = {};
        for (const key of Object.keys(this.pool)) record[key] = this.pool[key].actions;
        return record;
    }

    public getAllIdentifiers(): Record<string, number | undefined> {
        const record: Record<string, number | undefined> = {};
        for (const key of Object.keys(this.pool)) record[key] = this.pool[key].value?.identifier;
        return record;
    }

    public values(): ValueItem[] {
        const values: ValueItem[] = [];
        for (const key of Object.keys(this.pool)) {
            const v = this.pool[key];
            if (v.value) values.push(v.value);
        }
        return values;
    }
}

// transport identity pool
export class IdentityPool {
    private pool: Record<
        string,
        (_identity: ActorIdentity | undefined, _source: IdentitySource | undefined) => void
    >;

    constructor() {
        this.pool = {};
    }

    public unsubscribe(identifier: number): void {
        // console.error("unsubscribe", id);
        delete this.pool[`${identifier}`];
    }

    public subscribe(
        identifier: number,
        action: (_identity: ActorIdentity | undefined, _source: IdentitySource | undefined) => void,
    ) {
        // console.error("subscribe", identifier, action);

        this.pool[`${identifier}`] = action;
    }

    public pulse(
        identifier: number,
        identity: ActorIdentity | undefined,
        source: IdentitySource | undefined,
    ) {
        // console.error("pulse", identifier, identity, source, this.pool);

        const action = this.pool[`${identifier}`];
        if (!action) return;

        action(identity, source);
    }
}
