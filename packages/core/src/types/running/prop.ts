import { checkCandidValue } from '../candid';
import { deepClone } from '../common';
import { LightCore } from '../core';
import { ArgumentConstraint, DataSource, findVecArgumentConstraintByIndex } from '../source';
import { ValuePool } from './pool';

// find all prop data source and inject
export const loadProp = (core: LightCore, pool: ValuePool, prop: Record<string, any>) => {
    console.error('loadProp', prop);
    const loadPropByDataSource = (source: DataSource) => {
        switch (source.source) {
            case 'light':
                loadPropByArgumentConstraint(source.light.arg);
                break;
            case 'combined':
                loadPropByArgumentConstraint(source.combined.arg);
                break;
            case 'canister':
                if (!source.canister.canister_id.fixed) {
                    loadPropByDataSource(source.canister.canister_id.source);
                }
                loadPropByArgumentConstraint(source.canister.arg);
                break;
            case 'input':
                break;
            case 'constant':
                break;
            case 'inner':
                break;
            case 'prop':
                const name = source.prop.name;
                const value = prop[name];
                // if (value === undefined)
                //     throw new Error(`prop value: ${name} can not be undefined.`);
                if (value !== undefined) {
                    if (!checkCandidValue(source.prop.result, value, [])) {
                        console.error('prop target type and vale', source.prop.result, value);
                        throw new Error(`prop value: ${name} type is not match.`);
                    }
                    pool.init(
                        {
                            name,
                            type: deepClone(source.prop.result),
                            extra: {
                                constant: true,
                                runtime: { ok: deepClone(value) },
                            },
                        },
                        [],
                        undefined,
                    );
                }
                break;
            case 'outer':
                break;
        }
    };
    const loadPropByArgumentConstraint = (arg: ArgumentConstraint) => {
        switch (arg.constraint.type) {
            case 'force':
                loadPropByDataSource(arg.constraint.source);
                break;
            case 'blob':
                if (arg.constraint.constant === 0) break;
                if (arg.constraint.constant > 0) {
                    for (let i = 0; i < arg.constraint.constant; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        loadPropByArgumentConstraint(constraint);
                    }
                } else {
                    loadPropByDataSource(arg.constraint.length!);
                    const length = Math.max(
                        arg.constraint.subitems!.length,
                        arg.constraint.subitems2?.length ?? 0,
                    );
                    for (let i = 0; i < length; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        loadPropByArgumentConstraint(constraint);
                    }
                    loadPropByArgumentConstraint(arg.constraint.default!);
                }
                break;
            case 'vec':
                if (arg.constraint.constant === 0) return [];
                if (arg.constraint.constant > 0) {
                    for (let i = 0; i < arg.constraint.constant; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        loadPropByArgumentConstraint(constraint);
                    }
                } else {
                    loadPropByDataSource(arg.constraint.length!);
                    const length = Math.max(
                        arg.constraint.subitems!.length,
                        arg.constraint.subitems2?.length ?? 0,
                    );
                    for (let i = 0; i < length; i++) {
                        const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                        loadPropByArgumentConstraint(constraint);
                    }
                    loadPropByArgumentConstraint(arg.constraint.default!);
                }
                break;
            case 'opt':
                if (arg.constraint.constant === 0) return [];
                if (arg.constraint.constant !== 1) {
                    loadPropByDataSource(arg.constraint.has!);
                }
                loadPropByArgumentConstraint(arg.constraint.value);
                break;
            case 'record':
                for (const subitem of arg.constraint.subitems) {
                    loadPropByArgumentConstraint(subitem);
                }
                break;
            case 'variant':
                if (arg.constraint.constant) {
                    const key = arg.constraint.constant;
                    if (arg.type.subitems!.find((subitem) => subitem.key === key)) {
                        loadPropByArgumentConstraint(arg.constraint.value!);
                        break;
                    }
                }
                loadPropByDataSource(arg.constraint.select!);
                for (const subitem of arg.constraint.subitems!) {
                    loadPropByArgumentConstraint(subitem);
                }
                break;
            case 'tuple':
                for (const subitem of arg.constraint.subitems) {
                    loadPropByArgumentConstraint(subitem);
                }
                break;
            case 'rec':
                loadPropByArgumentConstraint(arg.constraint.value);
                break;
        }
    };
    for (const source of core.data) {
        loadPropByDataSource(source);
    }
};
