import { CandidType, Extra, findChildType } from '../candid';
import { deepClone } from '../common';
import { findTransformToCandidType } from '../transform';
import { DataSourceCanister } from './canister';
import { DataSourceCombined } from './combined';
import { DataSourceConstant } from './constant';
import { DataSourceInner } from './inner';
import { DataSourceInput } from './input';
import { DataSourceLight } from './light';
import { DataSourceOuter } from './outer';
import { DataSourceProp } from './prop';

export * from './arg';
export * from './canister';
export * from './combined';
export * from './constant';
export * from './inner';
export * from './input';
export * from './light';
export * from './outer';
export * from './prop';

export type SupportedDataSource =
    | 'light'
    | 'combined'
    | 'canister'
    | 'input'
    | 'constant'
    | 'inner'
    | 'prop'
    | 'outer';

export type DataSource =
    | DataSourceLight // data source 8
    | DataSourceCombined // data source 7
    | DataSourceCanister // data source 6
    | DataSourceInput // data source 5
    | DataSourceConstant // data source 4
    | DataSourceInner // data source 3
    | DataSourceProp // data source 2
    | DataSourceOuter; // data source 1

// find type of data source
export const findDataSourceType = (source: DataSource): CandidType => {
    switch (source.source) {
        case 'light':
            return (
                findTransformToCandidType(source.transform) ??
                findChildType(source.light.info.result, source.light.info.child ?? 0)
            );
        case 'combined':
            return findTransformToCandidType(source.transform)!;
        case 'canister':
            return (
                findTransformToCandidType(source.transform) ??
                findChildType(source.canister.method.result, source.canister.method.child ?? 0)
            );
        case 'input':
            return findTransformToCandidType(source.transform) ?? source.input.result;
        case 'constant':
            return findTransformToCandidType(source.transform) ?? source.constant.result;
        case 'inner':
            return findTransformToCandidType(source.transform) ?? source.inner.result;
        case 'prop':
            return findTransformToCandidType(source.transform) ?? source.prop.result;
        case 'outer':
            return findTransformToCandidType(source.transform) ?? source.outer.result;
    }
};

// find extra info of data source
export const findDataSourceExtra = (source: DataSource): Extra => {
    switch (source.source) {
        case 'light':
            return { constant: false };
        case 'combined':
            return { constant: false };
        case 'canister':
            return { constant: false };
        case 'input':
            return { constant: false };
        case 'constant':
            return { constant: true, runtime: { ok: deepClone(source.constant.value) } };
        case 'inner':
            return source.transform ? { constant: false } : deepClone(source.inner.extra);
        case 'prop':
            return { constant: false };
        case 'outer':
            return { constant: false };
    }
};
