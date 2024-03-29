import {
    CandidType,
    copyCandidType,
    findAloneType,
    isCanisterId,
    isSameCandidType,
} from '../candid';
import { DataResult } from '../common';
import {
    ArgumentConstraint,
    CanisterIdentity,
    DataSource,
    DataSourceCanister,
    DataSourceLight,
    findVecArgumentConstraintByIndex,
} from '../source';
import { DataTransmit } from '../transmit';
import {
    CandidValueItem,
    CustomIdentityValueItem,
    ValueItem,
    findInnerValueItemsByArgumentConstraint,
    findInnerValueItemsByExported,
    findOuterValueItemsByArgumentConstraint,
    findOuterValueItemsByExported,
    isCandidType,
    isCustomIdentityType,
} from './value';

export type CheckedResult<T> = {
    result: DataResult<T>;
    values: {
        outerValues: ValueItem[] | undefined;
        propValues: ValueItem[];
        innerValues: ValueItem[];
    };
};

export const checkDataSource = (
    source: DataSource,
    canExportValues: boolean,
    values: {
        outerValues: ValueItem[] | undefined;
        propValues: ValueItem[];
        innerValues: ValueItem[];
    },
    el?: HTMLElement,
): CheckedResult<DataSource> => {
    let outerValues = values.outerValues !== undefined ? [...values.outerValues] : undefined;
    let propValues = [...values.propValues];
    let innerValues = [...values.innerValues];

    switch (source.source) {
        case 'light':
            const basicLightResult = checkLightDataSource(source, el);
            if (basicLightResult.err !== undefined) {
                return {
                    result: basicLightResult,
                    values: { outerValues, propValues, innerValues },
                };
            }

            const lightResult = checkArgumentConstraint(
                source.light.arg,
                canExportValues,
                {
                    outerValues,
                    propValues,
                    innerValues,
                },
                el,
            );
            if (lightResult.result.err !== undefined) {
                return { ...lightResult, result: { err: lightResult.result.err } };
            }
            innerValues = lightResult.values.innerValues;
            outerValues = lightResult.values.outerValues;
            break;
        case 'combined':
            const combinedResult = checkArgumentConstraint(
                source.combined.arg,
                canExportValues,
                {
                    outerValues,
                    propValues,
                    innerValues,
                },
                el,
            );
            if (combinedResult.result.err !== undefined) {
                return { ...combinedResult, result: { err: combinedResult.result.err } };
            }
            innerValues = combinedResult.values.innerValues;
            outerValues = combinedResult.values.outerValues;
            break;
        case 'canister':
            const basicCanisterResult = checkCanisterDataSource(
                source,
                canExportValues,
                {
                    outerValues,
                    propValues,
                    innerValues,
                },
                el,
            );
            if (basicCanisterResult.err !== undefined) {
                return {
                    result: basicCanisterResult,
                    values: { outerValues, propValues, innerValues },
                };
            }

            const canisterResult = checkArgumentConstraint(
                source.canister.arg,
                canExportValues,
                {
                    outerValues,
                    propValues,
                    innerValues,
                },
                el,
            );
            if (canisterResult.result.err !== undefined) {
                return { ...canisterResult, result: { err: canisterResult.result.err } };
            }
            innerValues = canisterResult.values.innerValues;
            outerValues = canisterResult.values.outerValues;

            const canisterIdentityResult = checkCanisterIdentity(
                source.canister.identity,
                canExportValues,
                {
                    outerValues,
                    propValues,
                    innerValues,
                },
                el,
            );
            if (canisterIdentityResult.result.err !== undefined) {
                return {
                    ...canisterIdentityResult,
                    result: { err: canisterIdentityResult.result.err },
                };
            }
            innerValues = canisterIdentityResult.values.innerValues;
            outerValues = canisterIdentityResult.values.outerValues;
            break;
        case 'input':
        case 'constant':
            break;
        case 'inner':
            const innerName = source.inner.name;
            const inner = innerValues.find((value) => value.name === innerName);
            if (
                !inner ||
                !isCandidType(inner) ||
                !isSameCandidType(inner.type as CandidType, source.inner.result)
            ) {
                return {
                    result: { err: { message: `inner data source must has right name`, el } },
                    values: { outerValues, propValues, innerValues },
                };
            }
            break;
        case 'prop':
            const propName = source.prop.name;
            const prop = propValues.find((value) => value.name === propName);
            if (
                !prop ||
                !isCandidType(prop) ||
                !isSameCandidType(prop.type as CandidType, source.prop.result)
            ) {
                return {
                    result: { err: { message: `prop data source must has prop value`, el } },
                    values: { outerValues, propValues, innerValues },
                };
            }
            break;
        case 'outer':
            if (outerValues) {
                const outerName = source.outer.name?.trim();
                const outer = outerValues.find((value) => value.name === outerName);
                if (
                    !outer ||
                    !isCandidType(outer) ||
                    !isSameCandidType(outer.type as CandidType, source.outer.result)
                ) {
                    return {
                        result: { err: { message: `outer data source must has right name`, el } },
                        values: { outerValues, propValues, innerValues },
                    };
                }
            }
            break;
    }

    if (!canExportValues && source.exported !== undefined) {
        return {
            result: { err: { message: `can not export values`, el } },
            values: { outerValues, propValues, innerValues },
        };
    }

    innerValues = [...innerValues, ...findInnerValueItemsByExported(source, { propValues })];
    outerValues =
        outerValues === undefined
            ? undefined
            : [...outerValues, ...findOuterValueItemsByExported(source, { propValues })];

    return {
        result: { ok: source },
        values: { outerValues, propValues, innerValues },
    };
};

const checkCanisterDataSource = (
    source: DataSourceCanister,
    canExportValues: boolean,
    values: {
        outerValues: ValueItem[] | undefined;
        propValues: ValueItem[];
        innerValues: ValueItem[];
    },
    el?: HTMLElement,
): DataResult<DataSourceCanister> => {
    const canister = source.canister;
    // 1. canister id
    if (canister.canister_id.fixed && !isCanisterId(canister.canister_id.value)) {
        return { err: { message: `canister id must be valid`, el } };
    }
    if (!canister.canister_id.fixed) {
        // check data source
        const r = checkDataSource(canister.canister_id.source, canExportValues, values, el);
        if (r.result.err !== undefined) {
            return r.result;
        }
    }
    // 2. candid
    if (!canister.candid.did || !canister.candid.javascript) {
        return { err: { message: `canister candid must be valid`, el } };
    }
    // 3. method
    if (!canister.method.name) {
        return { err: { message: `canister method must be valid`, el } };
    }
    return { ok: source };
};
const checkLightDataSource = (
    source: DataSourceLight,
    el?: HTMLElement,
): DataResult<DataSourceLight> => {
    const light = source.light;
    // 1. canister id
    if (!isCanisterId(light.info.canister_id)) {
        return { err: { message: `light canister id must be valid`, el } };
    }
    if (!light.info.hash) {
        return { err: { message: `light hash must be valid`, el } };
    }
    return { ok: source };
};

export const checkArgumentConstraint = (
    arg: ArgumentConstraint,
    canExportValues: boolean,
    values: {
        outerValues: ValueItem[] | undefined;
        propValues: ValueItem[];
        innerValues: ValueItem[];
    },
    el?: HTMLElement,
): CheckedResult<ArgumentConstraint> => {
    let outerValues = values.outerValues !== undefined ? [...values.outerValues] : undefined;
    let propValues = [...values.propValues];
    let innerValues = [...values.innerValues];
    let mustEmpty: ValueItem[] = [];
    switch (arg.constraint.type) {
        case 'force':
            const forceResult = checkDataSource(
                arg.constraint.source,
                canExportValues,
                {
                    outerValues,
                    propValues,
                    innerValues,
                },
                el,
            );
            if (forceResult.result.err !== undefined) {
                return { ...forceResult, result: { err: forceResult.result.err } };
            }
            innerValues = forceResult.values.innerValues;
            outerValues = forceResult.values.outerValues;
            break;
        case 'blob':
            if (arg.constraint.constant === 0) break;
            if (arg.constraint.constant > 0) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    const r = checkArgumentConstraint(
                        constraint,
                        canExportValues,
                        {
                            outerValues,
                            propValues,
                            innerValues,
                        },
                        el,
                    );
                    if (r.result.err !== undefined) return r;
                    innerValues = r.values.innerValues;
                    outerValues = r.values.outerValues;
                }
            } else {
                const blobLengthResult = checkDataSource(
                    arg.constraint.length!,
                    canExportValues,
                    {
                        outerValues,
                        propValues,
                        innerValues,
                    },
                    el,
                );
                if (blobLengthResult.result.err !== undefined) {
                    return { ...blobLengthResult, result: { err: blobLengthResult.result.err } };
                }
                innerValues = blobLengthResult.values.innerValues;
                outerValues = blobLengthResult.values.outerValues;

                const mustEmpty: ValueItem[] = [];
                const length = Math.max(
                    arg.constraint.subitems!.length,
                    arg.constraint.subitems2?.length ?? 0,
                );
                for (let i = 0; i < length; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    findInnerValueItemsByArgumentConstraint(constraint, { propValues }, mustEmpty);
                    findOuterValueItemsByArgumentConstraint(
                        constraint,
                        { propValues, innerValues: mustEmpty },
                        mustEmpty,
                    );
                }
                findInnerValueItemsByArgumentConstraint(
                    arg.constraint.default!,
                    { propValues },
                    mustEmpty,
                );
                findOuterValueItemsByArgumentConstraint(
                    arg.constraint.default!,
                    { propValues, innerValues: mustEmpty },
                    mustEmpty,
                );
                if (mustEmpty.length) {
                    return {
                        result: { err: { message: `can not export values`, el } },
                        values: { outerValues, propValues, innerValues },
                    };
                }
            }
            break;
        case 'vec':
            if (arg.constraint.constant === 0) break;
            if (arg.constraint.constant > 0) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    const r = checkArgumentConstraint(
                        constraint,
                        canExportValues,
                        {
                            outerValues,
                            propValues,
                            innerValues,
                        },
                        el,
                    );
                    if (r.result.err !== undefined) return r;
                    innerValues = r.values.innerValues;
                    outerValues = r.values.outerValues;
                }
            } else {
                const vecLengthResult = checkDataSource(
                    arg.constraint.length!,
                    canExportValues,
                    {
                        outerValues,
                        propValues,
                        innerValues,
                    },
                    el,
                );
                if (vecLengthResult.result.err !== undefined) {
                    return { ...vecLengthResult, result: { err: vecLengthResult.result.err } };
                }
                innerValues = vecLengthResult.values.innerValues;
                outerValues = vecLengthResult.values.outerValues;

                const mustEmpty: ValueItem[] = [];
                const length = Math.max(
                    arg.constraint.subitems!.length,
                    arg.constraint.subitems2?.length ?? 0,
                );
                for (let i = 0; i < length; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    findInnerValueItemsByArgumentConstraint(constraint, { propValues }, mustEmpty);
                    findOuterValueItemsByArgumentConstraint(
                        constraint,
                        { propValues, innerValues: mustEmpty },
                        mustEmpty,
                    );
                }
                findInnerValueItemsByArgumentConstraint(
                    arg.constraint.default!,
                    { propValues },
                    mustEmpty,
                );
                findOuterValueItemsByArgumentConstraint(
                    arg.constraint.default!,
                    { propValues, innerValues: mustEmpty },
                    mustEmpty,
                );
                if (mustEmpty.length) {
                    return {
                        result: { err: { message: `can not export values`, el } },
                        values: { outerValues, propValues, innerValues },
                    };
                }
            }

            break;
        case 'opt':
            if (arg.constraint.constant === 0) break;
            if (arg.constraint.constant === 1) {
                const r = checkArgumentConstraint(
                    arg.constraint.value,
                    canExportValues,
                    {
                        outerValues,
                        propValues,
                        innerValues,
                    },
                    el,
                );
                if (r.result.err !== undefined) return r;
                innerValues = r.values.innerValues;
                outerValues = r.values.outerValues;
                break;
            }
            const optHasResult = checkDataSource(
                arg.constraint.has,
                canExportValues,
                {
                    outerValues,
                    propValues,
                    innerValues,
                },
                el,
            );
            if (optHasResult.result.err !== undefined) {
                return { ...optHasResult, result: { err: optHasResult.result.err } };
            }
            innerValues = optHasResult.values.innerValues;
            outerValues = optHasResult.values.outerValues;

            mustEmpty = [];
            findInnerValueItemsByArgumentConstraint(
                arg.constraint.value,
                { propValues },
                mustEmpty,
            );
            findOuterValueItemsByArgumentConstraint(
                arg.constraint.value,
                { propValues, innerValues: mustEmpty },
                mustEmpty,
            );
            if (mustEmpty.length) {
                return {
                    result: { err: { message: `can not export values`, el } },
                    values: { outerValues, propValues, innerValues },
                };
            }
            break;
        case 'record':
            for (let i = 0; i < arg.constraint.subitems.length; i++) {
                const constraint = arg.constraint.subitems[i];
                const r = checkArgumentConstraint(
                    constraint,
                    canExportValues,
                    {
                        outerValues,
                        propValues,
                        innerValues,
                    },
                    el,
                );
                if (r.result.err !== undefined) return r;
                innerValues = r.values.innerValues;
                outerValues = r.values.outerValues;
            }
            break;
        case 'variant':
            if (arg.constraint.constant) {
                const key = arg.constraint.constant;
                if (arg.type.subitems!.find((subitem) => subitem.key === key)) {
                    const r = checkArgumentConstraint(
                        arg.constraint.value!,
                        canExportValues,
                        {
                            outerValues,
                            propValues,
                            innerValues,
                        },
                        el,
                    );
                    if (r.result.err !== undefined) return r;
                    innerValues = r.values.innerValues;
                    outerValues = r.values.outerValues;
                    break;
                }
            }
            const variantSelectResult = checkDataSource(
                arg.constraint.select!,
                canExportValues,
                {
                    outerValues,
                    propValues,
                    innerValues,
                },
                el,
            );
            if (variantSelectResult.result.err !== undefined) {
                return { ...variantSelectResult, result: { err: variantSelectResult.result.err } };
            }
            innerValues = variantSelectResult.values.innerValues;
            outerValues = variantSelectResult.values.outerValues;

            mustEmpty = [];
            for (let i = 0; i < arg.constraint.subitems!.length; i++) {
                const constraint = arg.constraint.subitems![i];
                if (constraint !== undefined) {
                    findInnerValueItemsByArgumentConstraint(constraint, { propValues }, mustEmpty);
                    findOuterValueItemsByArgumentConstraint(
                        constraint,
                        { propValues, innerValues: mustEmpty },
                        mustEmpty,
                    );
                }
            }
            if (mustEmpty.length) {
                return {
                    result: { err: { message: `can not export values`, el } },
                    values: { outerValues, propValues, innerValues },
                };
            }
            break;
        case 'tuple':
            for (let i = 0; i < arg.constraint.subitems.length; i++) {
                const constraint = arg.constraint.subitems[i];
                const r = checkArgumentConstraint(
                    constraint,
                    canExportValues,
                    {
                        outerValues,
                        propValues,
                        innerValues,
                    },
                    el,
                );
                if (r.result.err !== undefined) return r;
                innerValues = r.values.innerValues;
                outerValues = r.values.outerValues;
            }
            break;
        case 'rec':
            const r = checkArgumentConstraint(
                arg.constraint.value,
                canExportValues,
                {
                    outerValues,
                    propValues,
                    innerValues,
                },
                el,
            );
            if (r.result.err !== undefined) return r;
            innerValues = r.values.innerValues;
            outerValues = r.values.outerValues;
            break;
    }

    return {
        result: { ok: arg },
        values: { outerValues, propValues, innerValues },
    };
};

export const checkCanisterIdentity = (
    identity: CanisterIdentity,
    canExportValues: boolean,
    values: {
        outerValues: ValueItem[] | undefined;
        propValues: ValueItem[];
        innerValues: ValueItem[];
    },
    el?: HTMLElement,
): CheckedResult<CanisterIdentity> => {
    if (identity.from === 'inner') {
        const name = identity.name;
        const inner = values.innerValues.find((value) => value.name === name);
        if (!inner || !isCustomIdentityType(inner)) {
            return {
                result: { err: { message: `inner identity must has right name`, el } },
                values,
            };
        }
    } else if (values.outerValues && identity.from === 'outer') {
        const name = identity.name?.trim();
        const outer = values.outerValues.find((value) => value.name === name);
        if (!outer || !isCustomIdentityType(outer)) {
            return {
                result: { err: { message: `outer identity must has right name`, el } },
                values,
            };
        }
        if (!['login', 'host-login'].includes(identity.detail ?? '')) {
            return {
                result: { err: { message: `outer identity detail must be valid`, el } },
                values,
            };
        }
    }

    if (identity.exported) {
        if (!canExportValues) {
            return {
                result: { err: { message: `can not export values`, el } },
                values,
            };
        }
        switch (identity.from) {
            case 'login':
            case 'host-login':
            case 'inner':
                switch (identity.exported.target) {
                    case 'inner':
                        const innerName = identity.exported.name;
                        if (values.innerValues.find((value) => value.name === innerName)) {
                            return {
                                result: {
                                    err: { message: `inner name ${innerName} already exists`, el },
                                },
                                values,
                            };
                        }
                        if (identity.from === 'inner') {
                            const chosen = values.innerValues
                                .filter((value) => value.name === identity.name)
                                .filter((value) =>
                                    isCustomIdentityType(value),
                                ) as CustomIdentityValueItem[];
                            if (chosen.length) {
                                const item = chosen[0];
                                const detail = item.detail;
                                values.innerValues.push({
                                    name: innerName,
                                    type: { type: 'identity' },
                                    detail,
                                    extra: { constant: false },
                                });
                            }
                        } else {
                            const detail = identity.from;
                            values.innerValues.push({
                                name: innerName,
                                type: { type: 'identity' },
                                detail,
                                extra: { constant: false },
                            });
                        }
                        break;
                    case 'outer':
                        if (values.outerValues) {
                            const outerName = identity.exported.name?.trim();
                            if (outerName) {
                                if (values.outerValues.find((value) => value.name === outerName)) {
                                    return {
                                        result: {
                                            err: {
                                                message: `outer name ${outerName} already exists`,
                                                el,
                                            },
                                        },
                                        values,
                                    };
                                }
                                if (identity.from === 'inner') {
                                    let chosen = values.outerValues
                                        .filter((value) => value.name === identity.name)
                                        .filter((value) =>
                                            isCustomIdentityType(value),
                                        ) as CustomIdentityValueItem[];
                                    if (chosen.length) {
                                        const item = chosen[0];
                                        const detail = item.detail;
                                        values.outerValues.push({
                                            name: outerName,
                                            type: { type: 'identity' },
                                            detail,
                                            extra: { constant: false },
                                        });
                                    }
                                } else {
                                    const detail = identity.from;
                                    values.outerValues.push({
                                        name: outerName,
                                        type: { type: 'identity' },
                                        detail,
                                        extra: { constant: false },
                                    });
                                }
                            }
                        }
                        break;
                }
        }
    }

    return {
        result: { ok: identity },
        values,
    };
};

export const checkTransmit = (
    transmit: DataTransmit,
    from: CandidType,
    values: {
        outerValues: ValueItem[] | undefined;
        propValues: ValueItem[];
        innerValues: ValueItem[];
    },
    el?: HTMLElement,
): CheckedResult<DataTransmit> => {
    let outerValues = values.outerValues !== undefined ? [...values.outerValues] : undefined;
    let propValues = [...values.propValues];
    let innerValues = [...values.innerValues];

    switch (transmit.transmit) {
        case 'outer':
            if (outerValues) {
                const outerName = transmit.exported.name?.trim();
                if (outerName) {
                    if (outerValues.find((value) => value.name === outerName)) {
                        return {
                            result: {
                                err: {
                                    message: `outer name ${outerName} already exists`,
                                    el,
                                },
                            },
                            values: { outerValues, propValues, innerValues },
                        };
                    }
                    const r: CandidValueItem = {
                        name: outerName,
                        type: copyCandidType(from),
                        extra: { constant: false },
                    };
                    const child = findAloneType(from);
                    if (child.child > 0) r.child = child.child;
                    outerValues.push(r);
                }
            }
            break;
        case 'show':
            break;
    }

    return { result: { ok: transmit }, values: { outerValues, propValues, innerValues } };
};
