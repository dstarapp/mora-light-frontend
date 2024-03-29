import { CandidType, CandidValue, isSameCandidType, parseTuple } from './candid';
import { StringResult, deepClone } from './common';
import { ValueItem, isCandidType } from './running';
import {
    CanisterInfo,
    DataSource,
    DataSourceCanister,
    DataSourceProp,
    findDataSourceType,
} from './source';
import { ArgumentConstraint, findVecArgumentConstraintByIndex } from './source/arg';
import { Transform } from './transform';
import { DataTransmit } from './transmit';
import { TriggerMode } from './trigger';

// light core data
export type LightCore = {
    version: string;
    data: DataSource[]; // known every source's result type
    trigger?: TriggerMode; // ? creating default is loading
    transform?: Transform; // ? creating
    transmits: DataTransmit[];
};

// find used lights
// findUsedLights takes in a LightCore object and returns an array of all lights that are currently in use.
export const findUsedLights = (core: LightCore): string[] => {
    const findUsedByArgumentConstraint = (arg: ArgumentConstraint): string[] => {
        const used: string[] = [];
        switch (arg.constraint.type) {
            case 'force':
                return findUsedByDataSource(arg.constraint.source);
            case 'blob':
                if (arg.constraint.constant === 0) return [];
                if (arg.constraint.constant > 0) {
                    for (let i = 0; i < arg.constraint.constant; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        used.push(...findUsedByArgumentConstraint(constraint));
                    }
                } else {
                    used.push(...findUsedByDataSource(arg.constraint.length!));
                    const length = Math.max(
                        arg.constraint.subitems!.length,
                        arg.constraint.subitems2?.length ?? 0,
                    );
                    for (let i = 0; i < length; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        used.push(...findUsedByArgumentConstraint(constraint));
                    }
                    used.push(...findUsedByArgumentConstraint(arg.constraint.default!));
                }
                return used;
            case 'vec':
                if (arg.constraint.constant === 0) return [];
                if (arg.constraint.constant > 0) {
                    for (let i = 0; i < arg.constraint.constant; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        used.push(...findUsedByArgumentConstraint(constraint));
                    }
                } else {
                    used.push(...findUsedByDataSource(arg.constraint.length!));
                    const length = Math.max(
                        arg.constraint.subitems!.length,
                        arg.constraint.subitems2?.length ?? 0,
                    );
                    for (let i = 0; i < length; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        used.push(...findUsedByArgumentConstraint(constraint));
                    }
                    used.push(...findUsedByArgumentConstraint(arg.constraint.default!));
                }
                return used;
            case 'opt':
                if (arg.constraint.constant === 0) return [];
                if (arg.constraint.constant !== 1) {
                    used.push(...findUsedByDataSource(arg.constraint.has!));
                }
                used.push(...findUsedByArgumentConstraint(arg.constraint.value));
                return used;
            case 'record':
                for (const subitem of arg.constraint.subitems) {
                    used.push(...findUsedByArgumentConstraint(subitem));
                }
                return used;
            case 'variant':
                if (arg.constraint.constant) {
                    const key = arg.constraint.constant;
                    if (arg.type.subitems!.find((subitem) => subitem.key === key)) {
                        return findUsedByArgumentConstraint(arg.constraint.value!);
                    }
                }
                used.push(...findUsedByDataSource(arg.constraint.select!));
                for (const subitem of arg.constraint.subitems!) {
                    used.push(...findUsedByArgumentConstraint(subitem));
                }
                return used;
            case 'tuple':
                for (const subitem of arg.constraint.subitems) {
                    used.push(...findUsedByArgumentConstraint(subitem));
                }
                return used;
            case 'rec':
                used.push(...findUsedByArgumentConstraint(arg.constraint.value));
                return used;
        }
    };
    const findUsedByDataSource = (source: DataSource): string[] => {
        switch (source.source) {
            case 'outer':
                return [];
            case 'prop':
                return [];
            case 'inner':
                return [];
            case 'constant':
                return [];
            case 'input':
                return [];
            case 'canister': // check args
                return findUsedByArgumentConstraint(source.canister.arg);
            case 'combined': // check args
                return findUsedByArgumentConstraint(source.combined.arg);
            case 'light':
                return [...findUsedByArgumentConstraint(source.light.arg), source.light.info.hash];
        }
    };

    const used: string[] = [];
    for (const source of core.data) {
        const found = findUsedByDataSource(source);
        for (const hash of found) {
            if (!used.includes(hash)) {
                used.push(hash);
            }
        }
    }
    return used;
};

export const findAllCanisterInfo = (
    core: LightCore,
): { canister_id: string; info: CanisterInfo }[] => {
    const findUsedByArgumentConstraint = (
        arg: ArgumentConstraint,
    ): { canister_id: string; info: CanisterInfo }[] => {
        const used: { canister_id: string; info: CanisterInfo }[] = [];
        switch (arg.constraint.type) {
            case 'force':
                return findUsedByDataSource(arg.constraint.source);
            case 'blob':
                if (arg.constraint.constant === 0) return [];
                if (arg.constraint.constant > 0) {
                    for (let i = 0; i < arg.constraint.constant; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        used.push(...findUsedByArgumentConstraint(constraint));
                    }
                } else {
                    used.push(...findUsedByDataSource(arg.constraint.length!));
                    const length = Math.max(
                        arg.constraint.subitems!.length,
                        arg.constraint.subitems2?.length ?? 0,
                    );
                    for (let i = 0; i < length; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        used.push(...findUsedByArgumentConstraint(constraint));
                    }
                    used.push(...findUsedByArgumentConstraint(arg.constraint.default!));
                }
                return used;
            case 'vec':
                if (arg.constraint.constant === 0) return [];
                if (arg.constraint.constant > 0) {
                    for (let i = 0; i < arg.constraint.constant; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        used.push(...findUsedByArgumentConstraint(constraint));
                    }
                } else {
                    used.push(...findUsedByDataSource(arg.constraint.length!));
                    const length = Math.max(
                        arg.constraint.subitems!.length,
                        arg.constraint.subitems2?.length ?? 0,
                    );
                    for (let i = 0; i < length; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        used.push(...findUsedByArgumentConstraint(constraint));
                    }
                    used.push(...findUsedByArgumentConstraint(arg.constraint.default!));
                }
                return used;
            case 'opt':
                if (arg.constraint.constant === 0) return [];
                if (arg.constraint.constant !== 1) {
                    used.push(...findUsedByDataSource(arg.constraint.has!));
                }
                used.push(...findUsedByArgumentConstraint(arg.constraint.value));
                return used;
            case 'record':
                for (const subitem of arg.constraint.subitems) {
                    used.push(...findUsedByArgumentConstraint(subitem));
                }
                return used;
            case 'variant':
                if (arg.constraint.constant) {
                    const key = arg.constraint.constant;
                    if (arg.type.subitems!.find((subitem) => subitem.key === key)) {
                        return findUsedByArgumentConstraint(arg.constraint.value!);
                    }
                }
                used.push(...findUsedByDataSource(arg.constraint.select!));
                for (const subitem of arg.constraint.subitems!) {
                    used.push(...findUsedByArgumentConstraint(subitem));
                }
                return used;
            case 'tuple':
                for (const subitem of arg.constraint.subitems) {
                    used.push(...findUsedByArgumentConstraint(subitem));
                }
                return used;
            case 'rec':
                used.push(...findUsedByArgumentConstraint(arg.constraint.value));
                return used;
        }
    };
    const findUsedByDataSource = (
        source: DataSource,
    ): { canister_id: string; info: CanisterInfo }[] => {
        switch (source.source) {
            case 'outer':
                return [];
            case 'prop':
                return [];
            case 'inner':
                return [];
            case 'constant':
                return [];
            case 'input':
                return [];
            case 'canister': // check args
                return [
                    ...findUsedByArgumentConstraint(source.canister.arg),
                    {
                        canister_id: source.canister.canister_id.fixed
                            ? source.canister.canister_id.value
                            : '',
                        info: source.canister.info,
                    },
                ];
            case 'combined': // check args
                return [];
            case 'light':
                return findUsedByArgumentConstraint(source.light.arg);
        }
    };

    const list: { canister_id: string; info: CanisterInfo }[] = [];
    for (const source of core.data) {
        const found = findUsedByDataSource(source);
        list.push(...found);
    }
    return list;
};

// try to find constant value from data source
export const findConstantValue = (
    source: DataSource,
    values: {
        propValues: ValueItem[];
    },
): StringResult<CandidValue> | undefined => {
    let value: StringResult<CandidValue> | undefined = undefined;
    switch (source.source) {
        case 'light':
            if (
                !source.transform &&
                source.light.info.extra.constant &&
                source.light.info.extra.runtime !== undefined
            ) {
                value = source.light.info.extra.runtime;
            }
            break;
        case 'combined':
            break;
        case 'canister':
            break;
        case 'input':
            break;
        case 'constant':
            if (!source.transform) {
                value = { ok: source.constant.value };
            }
            break;
        case 'inner':
            if (
                !source.transform &&
                source.inner.extra.constant &&
                source.inner.extra.runtime !== undefined
            ) {
                value = source.inner.extra.runtime;
            }
            break;
        case 'prop':
            if (!source.transform) {
                const prop = values.propValues.find((prop) => prop.name === source.prop.name);
                if (prop !== undefined) {
                    if (
                        isCandidType(prop) &&
                        isSameCandidType(prop.type as CandidType, source.prop.result) &&
                        prop.extra.constant
                    ) {
                        value = prop.extra.runtime;
                    }
                }
            }
            break;
        case 'outer':
            if (
                !source.transform &&
                source.outer.extra?.constant &&
                source.outer.extra.runtime !== undefined
            ) {
                value = source.outer.extra.runtime;
            }
            break;
    }
    return deepClone(value);
};

// find light's type and constant value if exist. note: did not care about transform of source
export const parseLightCandidType = (
    data: DataSource[],
    values: {
        propValues: ValueItem[];
    },
): {
    result: CandidType;
    runtime?: StringResult<CandidValue>; // ? creating: has value if is constant
} => {
    let subitems: CandidType[] = [];
    let constant = true;
    let error: StringResult<CandidValue> | undefined = undefined;
    const runtime: CandidValue[] = [];
    for (let i = 0; i < data.length; i++) {
        const source = data[i];
        subitems[i] = findDataSourceType(source); // find data source type
        // check constant or not
        if (constant) {
            const valueResult = findConstantValue(source, values);
            if (valueResult !== undefined) {
                if (valueResult.err !== undefined) error = valueResult;
                if (valueResult.ok !== undefined) {
                    runtime.push(valueResult.ok);
                    continue;
                }
            }
            constant = false; // dynamic if any value is dynamic
        }
    }

    const ok: {
        result: CandidType;
        runtime?: StringResult<CandidValue>;
    } = { result: parseTuple(subitems) };

    if (constant) ok.runtime = { ok: runtime };
    else if (error !== undefined) ok.runtime = error; // error message

    return ok;
};

export type LightStatusInfo = {
    has: boolean;
    hasDataComponent: boolean;
    hasTriggerComponent: boolean;
    hasShowComponent: boolean;
};

export const getLightStatusInfo = (light: LightCore | undefined): LightStatusInfo => {
    if (light === undefined) {
        return {
            has: false,
            hasDataComponent: false,
            hasTriggerComponent: false,
            hasShowComponent: false,
        };
    }

    const hasDataComponent = ((): boolean => {
        const data = light.data;

        const checkArgumentConstraint = (arg: ArgumentConstraint): boolean => {
            switch (arg.constraint.type) {
                case 'force':
                    return checkDataSource(arg.constraint.source);
                case 'blob':
                    if (arg.constraint.constant === 0) return false;

                    if (arg.constraint.constant > 0) {
                        for (let i = 0; i < arg.constraint.constant; i++) {
                            const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                            if (checkArgumentConstraint(constraint)) return true;
                        }
                        return false;
                    } else {
                        if (checkDataSource(arg.constraint.length!)) return true;
                        const length = Math.max(
                            arg.constraint.subitems!.length,
                            arg.constraint.subitems2?.length ?? 0,
                        );
                        for (let i = 0; i < length; i++) {
                            const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                            if (checkArgumentConstraint(constraint)) return true;
                        }
                        if (checkArgumentConstraint(arg.constraint.default!)) return true;
                    }

                    return false;
                case 'vec':
                    if (arg.constraint.constant === 0) return false;

                    if (arg.constraint.constant > 0) {
                        for (let i = 0; i < arg.constraint.constant; i++) {
                            const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                            if (checkArgumentConstraint(constraint)) return true;
                        }
                        return false;
                    } else {
                        if (checkDataSource(arg.constraint.length!)) return true;
                        const length = Math.max(
                            arg.constraint.subitems!.length,
                            arg.constraint.subitems2?.length ?? 0,
                        );
                        for (let i = 0; i < length; i++) {
                            const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                            if (checkArgumentConstraint(constraint)) return true;
                        }
                        if (checkArgumentConstraint(arg.constraint.default!)) return true;
                    }

                    return false;
                case 'opt':
                    if (arg.constraint.constant === 0) return false;

                    if (arg.constraint.constant === 1) {
                        return checkArgumentConstraint(arg.constraint.value);
                    }

                    if (checkDataSource(arg.constraint.has)) return true;
                    if (checkArgumentConstraint(arg.constraint.value)) return true;

                    return false;
                case 'record':
                    for (let i = 0; i < arg.constraint.subitems.length; i++) {
                        if (checkArgumentConstraint(arg.constraint.subitems[i])) return true;
                    }
                    return false;
                case 'variant':
                    if (arg.constraint.constant) {
                        const key = arg.constraint.constant;
                        if (arg.type.subitems!.find((subitem) => subitem.key === key)) {
                            return checkArgumentConstraint(arg.constraint.value!);
                        }
                    }

                    if (checkDataSource(arg.constraint.select!)) return true;
                    for (let i = 0; i < arg.constraint.subitems!.length; i++) {
                        if (checkArgumentConstraint(arg.constraint.subitems![i])) return true;
                    }

                    return false;
                case 'tuple':
                    for (let i = 0; i < arg.constraint.subitems.length; i++) {
                        if (checkArgumentConstraint(arg.constraint.subitems[i])) return true;
                    }
                    return false;
                case 'rec':
                    if (checkArgumentConstraint(arg.constraint.value)) return true;
                    return false;
            }
        };

        const checkDataSource = (source: DataSource): boolean => {
            switch (source.source) {
                case 'light':
                    return checkArgumentConstraint(source.light.arg);
                case 'combined':
                    return false;
                case 'canister':
                    if (checkArgumentConstraint(source.canister.arg)) return true;
                    switch (source.canister.identity.from) {
                        case 'anonymous':
                            return false;
                        case 'host':
                            return true;
                        case 'login':
                            return true;
                        case 'host-login':
                            return true;
                        case 'inner':
                            return true;
                        case 'outer':
                            return true;
                    }
                case 'input':
                    return true;
                case 'constant':
                    return false;
                case 'inner':
                    return false;
                case 'prop':
                    return false;
                case 'outer':
                    return false;
            }
        };

        for (let i = 0; i < data.length; i++) if (checkDataSource(data[i])) return true;

        return false;
    })();

    const hasTriggerComponent = ((): boolean => {
        const trigger = light.trigger;
        if (!trigger) return true;
        switch (trigger.type) {
            case 'loading':
                return true;
            case 'button':
                return true;
            case 'clock':
                return true;
        }
        return false;
    })();

    const hasShowComponent = ((): boolean =>
        !!light.transmits.filter((t) => t.transmit === 'show').length)();

    // console.error("lightStatusInfo", light, {
    //     has: hasDataComponent || hasTriggerComponent || hasShowComponent,
    //     hasDataComponent,
    //     hasTriggerComponent,
    //     hasShowComponent,
    // });

    return {
        has: hasDataComponent || hasTriggerComponent || hasShowComponent,
        hasDataComponent,
        hasTriggerComponent,
        hasShowComponent,
    };
};

export const findPropDataSources = (data: DataSource[]): DataSourceProp[] => {
    const sources: DataSourceProp[] = [];

    const findPropsByDataSource = (source: DataSource): DataSourceProp[] => {
        const sources: DataSourceProp[] = [];
        switch (source.source) {
            case 'light':
                sources.push(...findPropsByArgumentConstraint(source.light.arg));
                break;
            case 'combined':
                sources.push(...findPropsByArgumentConstraint(source.combined.arg));
                break;
            case 'canister':
                if (!source.canister.canister_id.fixed && source.canister.canister_id.source)
                    sources.push(...findPropsByDataSource(source.canister.canister_id.source));
                sources.push(...findPropsByArgumentConstraint(source.canister.arg));
                break;
            case 'input':
                break;
            case 'constant':
                break;
            case 'inner':
                break;
            case 'prop':
                sources.push(deepClone(source));
                break;
            case 'outer':
                break;
        }
        return sources;
    };
    const findPropsByArgumentConstraint = (arg: ArgumentConstraint): DataSourceProp[] => {
        const sources: DataSourceProp[] = [];
        switch (arg.constraint.type) {
            case 'force':
                sources.push(...findPropsByDataSource(arg.constraint.source));
                break;
            case 'blob':
                if (arg.constraint.constant === 0) break;
                if (arg.constraint.constant > 0) {
                    for (let i = 0; i < arg.constraint.constant; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        sources.push(...findPropsByArgumentConstraint(constraint));
                    }
                } else {
                    if (findPropsByDataSource(arg.constraint.length!)) return sources;
                    const length = Math.max(
                        arg.constraint.subitems!.length,
                        arg.constraint.subitems2?.length ?? 0,
                    );
                    for (let i = 0; i < length; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        sources.push(...findPropsByArgumentConstraint(constraint));
                    }
                }
                break;
            case 'vec':
                if (arg.constraint.constant === 0) break;
                if (arg.constraint.constant > 0) {
                    for (let i = 0; i < arg.constraint.constant; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        sources.push(...findPropsByArgumentConstraint(constraint));
                    }
                } else {
                    if (findPropsByDataSource(arg.constraint.length!)) return sources;
                    const length = Math.max(
                        arg.constraint.subitems!.length,
                        arg.constraint.subitems2?.length ?? 0,
                    );
                    for (let i = 0; i < length; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        sources.push(...findPropsByArgumentConstraint(constraint));
                    }
                }
                break;
            case 'opt':
                if (arg.constraint.constant === 0) break;
                if (arg.constraint.constant !== 1) {
                    sources.push(...findPropsByDataSource(arg.constraint.has!));
                }
                sources.push(...findPropsByArgumentConstraint(arg.constraint.value!));
                break;
            case 'record':
                for (const subitem of arg.constraint.subitems) {
                    sources.push(...findPropsByArgumentConstraint(subitem));
                }
                break;
            case 'variant':
                if (arg.constraint.constant) {
                    const key = arg.constraint.constant;
                    if (arg.type.subitems!.find((subitem) => subitem.key === key)) {
                        return findPropsByArgumentConstraint(arg.constraint.value!);
                    }
                }
                sources.push(...findPropsByDataSource(arg.constraint.select!));
                for (const subitem of arg.constraint.subitems!) {
                    sources.push(...findPropsByArgumentConstraint(subitem));
                }
                break;
            case 'tuple':
                for (const subitem of arg.constraint.subitems) {
                    sources.push(...findPropsByArgumentConstraint(subitem));
                }
                break;
            case 'rec':
                sources.push(...findPropsByArgumentConstraint(arg.constraint.value));
                break;
        }
        return sources;
    };

    for (const source of data) {
        sources.push(...findPropsByDataSource(source));
    }

    // check name and type
    const props: Record<string, CandidType> = {};
    const sources2: DataSourceProp[] = [];
    for (const source of sources) {
        if (!source.prop.name) throw new Error('prop name is required');
        const name = source.prop.name;
        const type = props[name];
        if (!type) {
            props[name] = source.prop.result;
            sources2.push(source);
        } else if (!isSameCandidType(type, source.prop.result)) {
            throw new Error('same prop name require same type');
        }
    }

    return sources2;
};

export const findCanisterDataSources = (data: DataSource[]): DataSourceCanister[] => {
    const sources: DataSourceCanister[] = [];

    const findCanisterByDataSource = (source: DataSource): DataSourceCanister[] => {
        const sources: DataSourceCanister[] = [];
        switch (source.source) {
            case 'light':
                sources.push(...findCanisterByArgumentConstraint(source.light.arg));
                break;
            case 'combined':
                sources.push(...findCanisterByArgumentConstraint(source.combined.arg));
                break;
            case 'canister':
                if (!source.canister.canister_id.fixed && source.canister.canister_id.source)
                    sources.push(...findCanisterByDataSource(source.canister.canister_id.source));
                sources.push(...findCanisterByArgumentConstraint(source.canister.arg));
                sources.push(deepClone(source));
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
        return sources;
    };
    const findCanisterByArgumentConstraint = (arg: ArgumentConstraint): DataSourceCanister[] => {
        const sources: DataSourceCanister[] = [];
        switch (arg.constraint.type) {
            case 'force':
                sources.push(...findCanisterByDataSource(arg.constraint.source));
                break;
            case 'blob':
                if (arg.constraint.constant === 0) break;
                if (arg.constraint.constant > 0) {
                    for (let i = 0; i < arg.constraint.constant; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        sources.push(...findCanisterByArgumentConstraint(constraint));
                    }
                } else {
                    if (findCanisterByDataSource(arg.constraint.length!)) return sources;
                    const length = Math.max(
                        arg.constraint.subitems!.length,
                        arg.constraint.subitems2?.length ?? 0,
                    );
                    for (let i = 0; i < length; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        sources.push(...findCanisterByArgumentConstraint(constraint));
                    }
                }
                break;
            case 'vec':
                if (arg.constraint.constant === 0) break;
                if (arg.constraint.constant > 0) {
                    for (let i = 0; i < arg.constraint.constant; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        sources.push(...findCanisterByArgumentConstraint(constraint));
                    }
                } else {
                    if (findCanisterByDataSource(arg.constraint.length!)) return sources;
                    const length = Math.max(
                        arg.constraint.subitems!.length,
                        arg.constraint.subitems2?.length ?? 0,
                    );
                    for (let i = 0; i < length; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        sources.push(...findCanisterByArgumentConstraint(constraint));
                    }
                }
                break;
            case 'opt':
                if (arg.constraint.constant === 0) break;
                if (arg.constraint.constant !== 1) {
                    sources.push(...findCanisterByDataSource(arg.constraint.has!));
                }
                sources.push(...findCanisterByArgumentConstraint(arg.constraint.value!));
                break;
            case 'record':
                for (const subitem of arg.constraint.subitems) {
                    sources.push(...findCanisterByArgumentConstraint(subitem));
                }
                break;
            case 'variant':
                if (arg.constraint.constant) {
                    const key = arg.constraint.constant;
                    if (arg.type.subitems!.find((subitem) => subitem.key === key)) {
                        return findCanisterByArgumentConstraint(arg.constraint.value!);
                    }
                }
                sources.push(...findCanisterByDataSource(arg.constraint.select!));
                for (const subitem of arg.constraint.subitems!) {
                    sources.push(...findCanisterByArgumentConstraint(subitem));
                }
                break;
            case 'tuple':
                for (const subitem of arg.constraint.subitems) {
                    sources.push(...findCanisterByArgumentConstraint(subitem));
                }
                break;
            case 'rec':
                sources.push(...findCanisterByArgumentConstraint(arg.constraint.value));
                break;
        }
        return sources;
    };

    for (const source of data) {
        sources.push(...findCanisterByDataSource(source));
    }

    return sources;
};
