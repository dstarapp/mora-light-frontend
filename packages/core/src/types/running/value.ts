import {
    ActorIdentity,
    CANDID_TYPE_LIST,
    CUSTOM_TYPE_LIST,
    CandidType,
    CandidValue,
    CustomValue,
    Extra,
    findAloneType,
    isSameCandidType,
} from '../candid';
import { StringResult } from '../common';
import { LightCore, findConstantValue, parseLightCandidType } from '../core';
import { ArgumentConstraint, DataSource, findDataSourceType } from '../source';
import { findTransformToCandidType } from '../transform';

// transport value
export type CandidValueItem = {
    name: string;

    type: CandidType; // variable type
    child?: number;

    extra: Extra;
    identifier?: undefined; // mark
};

export type CustomIdentityValueItem = {
    name: string; // name

    type: { type: 'identity' }; // variable type

    detail: 'login' | 'host-login'; // more detail info

    extra: {
        constant: false; // can not be constant
        // ? running
        runtime?: StringResult<ActorIdentity>; // running time
    };

    // ? running
    identifier?: number; // bound identity
};

export type CustomValueItem = CustomIdentityValueItem;

export type ValueItem = CandidValueItem | CustomValueItem;

export type ValueItemValue = CandidValue | CustomValue;

// filter type
export const isCandidType = (item: ValueItem): boolean =>
    CANDID_TYPE_LIST.includes(item.type.type as any);
export const isCustomType = (item: ValueItem): boolean =>
    CUSTOM_TYPE_LIST.includes(item.type.type as any);

// filter type: identity
export const isCustomIdentityType = (item: ValueItem): boolean => 'identity' === item.type.type;

// check item
export const isSameValueItemType = (item1: ValueItem, item2: ValueItem): boolean => {
    if (item1.name !== item2.name) return false;

    if (isCandidType(item1) && isCandidType(item2)) {
        if (!isSameCandidType(item1.type as CandidType, item2.type as CandidType)) return false;
        return true;
    }

    if (isCustomIdentityType(item1) && isCustomIdentityType(item2)) {
        return true;
    }

    return false;
};

// compare value
export const getValueItem = (nv: ValueItem, ov: ValueItem | undefined): ValueItem => {
    if (ov === undefined) return nv;
    if (nv.name !== ov.name) return nv;
    if (!isSameValueItemType(nv, ov)) return nv;
    return ov;
};

// =========================== light inner value ===========================

// find exported inner value
export const findInnerValueItemsByLightCore = (
    light: LightCore,
    values: {
        propValues: ValueItem[];
    },
): ValueItem[] => {
    const valueItems: ValueItem[] = [];

    for (let i = 0; i < light.data.length; i++) {
        findInnerValueItemsByDataSource(light.data[i], values, valueItems); // find exported inner value from data source
    }

    return valueItems;
};

// find exported inner value from data source
export const findInnerValueItemsByDataSource = (
    source: DataSource,
    values: {
        propValues: ValueItem[];
    },
    valueItems: ValueItem[],
) => {
    switch (source.source) {
        case 'light':
            // light has arg
            findInnerValueItemsByArgumentConstraint(source.light.arg, values, valueItems);
            break;
        case 'combined':
            // combined has arg
            findInnerValueItemsByArgumentConstraint(source.combined.arg, values, valueItems);
            break;
        case 'canister':
            // canister has arg
            findInnerValueItemsByArgumentConstraint(source.canister.arg, values, valueItems);

            switch (source.canister.identity.from) {
                case 'login':
                case 'host-login':
                case 'inner':
                    if (source.canister.identity.exported?.target === 'inner') {
                        // canister's identity cloud be exported
                        if (source.canister.identity.from === 'inner') {
                            // find pervious exported inner value if from is inner
                            let chosen = valueItems
                                .filter(
                                    (valueItem) => valueItem.name === source.canister.identity.name,
                                )
                                .filter((valueItem) =>
                                    isCustomIdentityType(valueItem),
                                ) as CustomIdentityValueItem[];
                            if (chosen.length) {
                                const item = chosen[0];
                                const detail = item.detail;
                                valueItems.push({
                                    name: source.canister.identity.exported.name,
                                    type: { type: 'identity' },
                                    detail,
                                    extra: { constant: false }, // not sure
                                });
                            }
                        } else {
                            const detail = source.canister.identity.from;
                            valueItems.push({
                                name: source.canister.identity.exported.name,
                                type: { type: 'identity' },
                                detail,
                                extra: { constant: false }, // not sure
                            });
                        }
                    }
            }

            break;
        case 'input':
        case 'constant':
        case 'inner':
        case 'prop':
        case 'outer':
            break;
    }

    valueItems.push(...findInnerValueItemsByExported(source, values)); // insert exported inner value if found
};

// find exported inner value from argument constraint
export const findInnerValueItemsByArgumentConstraint = (
    arg: ArgumentConstraint,
    values: {
        propValues: ValueItem[];
    },
    valueItems: ValueItem[],
) => {
    switch (arg.constraint.type) {
        case 'force':
            findInnerValueItemsByDataSource(arg.constraint.source, values, valueItems);
            break;
        case 'blob':
            if (arg.constraint.length) {
                findInnerValueItemsByDataSource(arg.constraint.length, values, valueItems);
            }

            // only constant
            if (arg.constraint.constant > 0 && arg.constraint.subitems) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = arg.constraint.subitems[i]?.constraint;
                    if (constraint !== undefined) {
                        findInnerValueItemsByArgumentConstraint(constraint, values, valueItems);
                    }
                }
            }
            break;
        case 'vec':
            if (arg.constraint.length) {
                findInnerValueItemsByDataSource(arg.constraint.length, values, valueItems);
            }

            // only constant
            if (arg.constraint.constant > 0 && arg.constraint.subitems) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = arg.constraint.subitems[i]?.constraint;
                    if (constraint !== undefined) {
                        findInnerValueItemsByArgumentConstraint(constraint, values, valueItems);
                    }
                }
            }
            break;
        case 'opt':
            if (arg.constraint.has) {
                findInnerValueItemsByDataSource(arg.constraint.has, values, valueItems);
            }

            // only constant
            if (arg.constraint.constant === 1) {
                findInnerValueItemsByArgumentConstraint(arg.constraint.value, values, valueItems);
            }
            break;
        case 'record':
            for (let i = 0; i < arg.constraint.subitems.length; i++) {
                findInnerValueItemsByArgumentConstraint(
                    arg.constraint.subitems[i],
                    values,
                    valueItems,
                );
            }
            break;
        case 'variant':
            if (arg.constraint.select) {
                findInnerValueItemsByDataSource(arg.constraint.select, values, valueItems);
            }

            // only constant
            if (arg.constraint.constant && arg.constraint.subitems) {
                for (let i = 0; i < arg.constraint.subitems.length; i++) {
                    if (arg.constraint.constant === arg.type.subitems![i].key) {
                        // only the chosen one
                        findInnerValueItemsByArgumentConstraint(
                            arg.constraint.subitems[i],
                            values,
                            valueItems,
                        );
                        break;
                    }
                }
            }
            break;
        case 'tuple':
            for (let i = 0; i < arg.constraint.subitems.length; i++) {
                findInnerValueItemsByArgumentConstraint(
                    arg.constraint.subitems[i],
                    values,
                    valueItems,
                );
            }
            break;
        case 'rec':
            findInnerValueItemsByArgumentConstraint(arg.constraint.value, values, valueItems);
            break;
    }
};

// find exported inner value from exported data
export const findInnerValueItemsByExported = (
    source: DataSource,
    values: {
        propValues: ValueItem[];
    },
): ValueItem[] => {
    const valueItems: ValueItem[] = [];

    if (source.exported?.target === 'inner') {
        // if export to inner
        let valueResult: StringResult<CandidValue> | undefined = findConstantValue(source, values);

        const sourceType = findDataSourceType(source); // find data source type
        const child = findAloneType(sourceType);
        const r: ValueItem = {
            name: source.exported.name,
            type: sourceType,
            extra: { constant: false }, // default is dynamic
        };
        if (child.child) r.child = child.child;

        if (valueResult?.ok !== undefined) r.extra = { constant: true, runtime: valueResult }; // constant if found

        valueItems.push(r);
    }

    return valueItems;
};

// =========================== light outer value ===========================

// find exported outer value
export const findOuterValueItemsByLightCore = (
    light: LightCore,
    values: {
        propValues: ValueItem[];
    },
): ValueItem[] => {
    const innerValues: ValueItem[] = [];
    const valueItems: ValueItem[] = [];

    for (let i = 0; i < light.data.length; i++) {
        findInnerValueItemsByDataSource(light.data[i], values, innerValues);
        findOuterValueItemsByDataSource(
            light.data[i],
            { propValues: values.propValues, innerValues },
            valueItems,
        ); // find exported outer value from data source
    }

    // try to find exported outer value from transmit=
    let { result: dataResult, runtime: runtimeResult } = parseLightCandidType(light.data, values); // find light's result type
    if (light.transform) {
        dataResult = findTransformToCandidType(light.transform)!;
        runtimeResult = undefined; // must be dynamic if there is transform
    }

    for (let i = 0; i < light.transmits.length; i++) {
        const transmit = light.transmits[i];
        if (transmit.transmit === 'outer') {
            let type = dataResult;
            let runtime = runtimeResult;
            if (transmit.transform) {
                type = findTransformToCandidType(transmit.transform)!;
                runtime = undefined; // must be dynamic if there is transform
            }
            const name = (transmit.exported.name ?? '').trim();
            if (name) {
                valueItems.push({
                    name,
                    type,
                    child: findAloneType(type).child,
                    extra:
                        runtime?.ok !== undefined
                            ? { constant: true, runtime }
                            : { constant: false },
                });
            }
        }
    }

    return valueItems;
};

export const findOuterValueItemsByDataSource = (
    source: DataSource,
    values: {
        propValues: ValueItem[];
        innerValues: ValueItem[];
    },
    valueItems: ValueItem[],
) => {
    switch (source.source) {
        case 'light':
            // light has arg
            findInnerValueItemsByArgumentConstraint(
                source.light.arg,
                { propValues: values.propValues },
                values.innerValues,
            );
            findOuterValueItemsByArgumentConstraint(source.light.arg, values, valueItems);
            break;
        case 'combined':
            // combined has arg
            findInnerValueItemsByArgumentConstraint(
                source.combined.arg,
                { propValues: values.propValues },
                values.innerValues,
            );
            findOuterValueItemsByArgumentConstraint(source.combined.arg, values, valueItems);
            break;
        case 'canister':
            // canister has arg
            findInnerValueItemsByArgumentConstraint(
                source.canister.arg,
                { propValues: values.propValues },
                values.innerValues,
            );
            findOuterValueItemsByArgumentConstraint(source.canister.arg, values, valueItems);

            switch (source.canister.identity.from) {
                case 'login':
                case 'host-login':
                case 'inner':
                    if (source.canister.identity.exported?.target === 'inner') {
                        // canister's identity cloud be exported
                        if (source.canister.identity.from === 'inner') {
                            // find pervious exported inner value if from is inner
                            let chosen = values.innerValues
                                .filter((value) => value.name === source.canister.identity.name)
                                .filter((value) =>
                                    isCustomIdentityType(value),
                                ) as CustomIdentityValueItem[];
                            if (chosen.length) {
                                const item = chosen[0];
                                const detail = item.detail;
                                values.innerValues.push({
                                    name: source.canister.identity.exported.name,
                                    type: { type: 'identity' },
                                    detail,
                                    extra: { constant: false }, // not sure
                                });
                            }
                        } else {
                            const detail = source.canister.identity.from;
                            values.innerValues.push({
                                name: source.canister.identity.exported.name,
                                type: { type: 'identity' },
                                detail,
                                extra: { constant: false }, // not sure
                            });
                        }
                    }
            }

            switch (source.canister.identity.from) {
                case 'login':
                case 'host-login':
                case 'inner':
                    if (source.canister.identity.exported?.target === 'outer') {
                        // canister's identity cloud be exported
                        const exportedName = (source.canister.identity.exported.name ?? '').trim();
                        if (exportedName) {
                            if (source.canister.identity.from === 'inner') {
                                // find pervious exported inner value if from is inner
                                let chosen = values.innerValues
                                    .filter((value) => value.name === source.canister.identity.name)
                                    .filter((value) =>
                                        isCustomIdentityType(value),
                                    ) as CustomIdentityValueItem[];
                                if (chosen.length) {
                                    const item = chosen[0];
                                    const detail = item.detail;
                                    valueItems.push({
                                        name: exportedName,
                                        type: { type: 'identity' },
                                        detail,
                                        extra: { constant: false }, // not sure
                                    });
                                }
                            } else {
                                const detail = source.canister.identity.from;
                                valueItems.push({
                                    name: exportedName,
                                    type: { type: 'identity' },
                                    detail,
                                    extra: { constant: false }, // not sure
                                });
                            }
                        }
                    }
            }
            break;
        case 'input':
        case 'constant':
        case 'inner':
        case 'prop':
        case 'outer':
            break;
    }

    values.innerValues.push(
        ...findInnerValueItemsByExported(source, { propValues: values.propValues }),
    ); // insert exported inner value if found
    valueItems.push(...findOuterValueItemsByExported(source, { propValues: values.propValues })); // insert exported outer value if found
};

// find exported outer value from argument constraint
export const findOuterValueItemsByArgumentConstraint = (
    arg: ArgumentConstraint,
    values: {
        propValues: ValueItem[];
        innerValues: ValueItem[];
    },
    valueItems: ValueItem[],
) => {
    switch (arg.constraint.type) {
        case 'force':
            findInnerValueItemsByDataSource(
                arg.constraint.source,
                { propValues: values.propValues },
                values.innerValues,
            );
            findOuterValueItemsByDataSource(arg.constraint.source, values, valueItems);
            break;
        case 'blob':
            if (arg.constraint.length) {
                findInnerValueItemsByDataSource(
                    arg.constraint.length,
                    { propValues: values.propValues },
                    values.innerValues,
                );
                findOuterValueItemsByDataSource(arg.constraint.length, values, valueItems);
            }

            // only constant
            if (arg.constraint.constant > 0 && arg.constraint.subitems) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = arg.constraint.subitems[i]?.constraint;
                    if (constraint !== undefined) {
                        findInnerValueItemsByArgumentConstraint(
                            constraint,
                            { propValues: values.propValues },
                            values.innerValues,
                        );
                        findOuterValueItemsByArgumentConstraint(constraint, values, valueItems);
                    }
                }
            }
            break;
        case 'vec':
            if (arg.constraint.length) {
                findInnerValueItemsByDataSource(
                    arg.constraint.length,
                    { propValues: values.propValues },
                    values.innerValues,
                );
                findOuterValueItemsByDataSource(arg.constraint.length, values, valueItems);
            }

            // only constant
            if (arg.constraint.constant > 0 && arg.constraint.subitems) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = arg.constraint.subitems[i]?.constraint;
                    if (constraint !== undefined) {
                        findInnerValueItemsByArgumentConstraint(
                            constraint,
                            { propValues: values.propValues },
                            values.innerValues,
                        );
                        findOuterValueItemsByArgumentConstraint(constraint, values, valueItems);
                    }
                }
            }
            break;
        case 'opt':
            if (arg.constraint.has) {
                findInnerValueItemsByDataSource(
                    arg.constraint.has,
                    { propValues: values.propValues },
                    values.innerValues,
                );
                findOuterValueItemsByDataSource(arg.constraint.has, values, valueItems);
            }

            // only constant
            if (arg.constraint.constant === 1) {
                findInnerValueItemsByArgumentConstraint(
                    arg.constraint.value,
                    { propValues: values.propValues },
                    values.innerValues,
                );
                findOuterValueItemsByArgumentConstraint(arg.constraint.value, values, valueItems);
            }
            break;
        case 'record':
            for (let i = 0; i < arg.constraint.subitems.length; i++) {
                findInnerValueItemsByArgumentConstraint(
                    arg.constraint.subitems[i],
                    { propValues: values.propValues },
                    values.innerValues,
                );
                findOuterValueItemsByArgumentConstraint(
                    arg.constraint.subitems[i],
                    values,
                    valueItems,
                );
            }
            break;
        case 'variant':
            if (arg.constraint.select) {
                findInnerValueItemsByDataSource(
                    arg.constraint.select,
                    { propValues: values.propValues },
                    values.innerValues,
                );
                findOuterValueItemsByDataSource(arg.constraint.select, values, valueItems);
            }

            // only constant
            if (arg.constraint.constant && arg.constraint.subitems) {
                for (let i = 0; i < arg.constraint.subitems.length; i++) {
                    if (arg.constraint.constant === arg.type.subitems![i].key) {
                        // only the chosen one
                        findInnerValueItemsByArgumentConstraint(
                            arg.constraint.subitems[i],
                            { propValues: values.propValues },
                            values.innerValues,
                        );
                        findOuterValueItemsByArgumentConstraint(
                            arg.constraint.subitems[i],
                            values,
                            valueItems,
                        );
                        break;
                    }
                }
            }
            break;
        case 'tuple':
            for (let i = 0; i < arg.constraint.subitems.length; i++) {
                findInnerValueItemsByArgumentConstraint(
                    arg.constraint.subitems[i],
                    { propValues: values.propValues },
                    values.innerValues,
                );
                findOuterValueItemsByArgumentConstraint(
                    arg.constraint.subitems[i],
                    values,
                    valueItems,
                );
            }
            break;
        case 'rec':
            findInnerValueItemsByArgumentConstraint(
                arg.constraint.value,
                { propValues: values.propValues },
                values.innerValues,
            );
            findOuterValueItemsByArgumentConstraint(arg.constraint.value, values, valueItems);
            break;
    }
};

// find exported outer value from exported data
export const findOuterValueItemsByExported = (
    source: DataSource,
    values: {
        propValues: ValueItem[];
    },
): ValueItem[] => {
    // const valueItems: ValueItem[] = [];

    if (source.exported?.target === 'outer') {
        const name = source.exported.name?.trim();
        if (name) {
            // if export to outer and has name
            let valueResult: StringResult<CandidValue> | undefined = findConstantValue(source, {
                propValues: values.propValues,
            });

            const sourceType = findDataSourceType(source); // find data source type
            const child = findAloneType(sourceType);
            const r: ValueItem = {
                name,
                type: sourceType,
                extra: { constant: false }, // default is dynamic
            };
            if (child.child) r.child = child.child;

            if (valueResult?.ok !== undefined) r.extra = { constant: true, runtime: valueResult };

            return [r];
        }
    }

    return [];
};
