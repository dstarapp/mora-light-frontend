import { CandidType, CandidTypeSubitem } from './candid';
import {
    INT16_MAX,
    INT16_MIN,
    INT32_MAX,
    INT32_MIN,
    INT64_MAX,
    INT64_MIN,
    INT8_MAX,
    INT8_MIN,
    INT_REGEX,
    NAT16_MAX,
    NAT32_MAX,
    NAT64_MAX,
    NAT8_MAX,
    NAT_MIN,
    NAT_REGEX,
} from './numbers';
import { CandidValue } from './value';
import { isPrincipal, isCanisterId, findAloneType } from './common';
import { RecItem, findRecSubtype } from './initial';
import { stringifyCandidType } from './wraps';
import { Principal } from '@dfinity/principal';
import { DataResult } from '../common';

export const findChildTypeAndValue = (
    value: CandidValue,
    from: CandidType,
    child?: number,
): { type: CandidType; value: CandidValue } => {
    // 1. check type and values
    if (!checkCandidValue(from, value, [])) {
        throw new Error(
            `value: ${JSON.stringify(value)} is not match type: ${stringifyCandidType(from)}`,
        );
    }
    if (child === undefined || child === 0) return { type: from, value }; // does not need fetch child

    // 2. check child level
    if (findAloneType(from).child !== child) {
        throw new Error(`type: ${stringifyCandidType(from)} and child: ${child} is not matched`);
    }

    // 3. fetch child
    while (child > 0) {
        from = from.subitems![0].type;
        value = (value as any)[0];
        child--;
    }

    // 4. return value
    return { type: from, value };
};

// ================== check value and type ==================

export const isArray = (value: CandidValue): boolean => {
    if (value === undefined) return false;
    if (value === null) return false;
    const flag = Object.prototype.toString.call(value) === '[object Array]';
    if (flag) return flag;
    if (typeof value !== 'object') return false;
    // some array like {length: 1, 0: 1}, obviously it is object
    let length = (value as any)['length'];
    if (!['number', 'undefined'].includes(typeof length)) return false;
    const keys = Object.keys(value)
        .filter((key) => key !== 'length')
        .map((key) => parseInt(key));
    if (typeof length === 'number' && length !== keys.length) return false;
    length = keys.length;
    for (let i = 0; i < length; i++) {
        const index = keys.indexOf(i);
        if (index >= 0) keys.splice(index, 1);
    }
    if (keys.length) return false;
    (value as any)['length'] = length; // add length filed
    return true;
};
export const isBool = (value: CandidValue): boolean => typeof value === 'boolean';
export const isNat = (value: CandidValue): boolean =>
    typeof value === 'object' &&
    (value as any)['type'] === 'bigint' &&
    (value as any)['value'].match(NAT_REGEX);
export const isInt = (value: CandidValue): boolean =>
    typeof value === 'object' &&
    (value as any)['type'] === 'bigint' &&
    (value as any)['value'].match(INT_REGEX);
export const isNat8 = (value: CandidValue): boolean =>
    typeof value === 'number' && Number(NAT_MIN) <= value && value <= Number(NAT8_MAX);
export const isNat16 = (value: CandidValue): boolean =>
    typeof value === 'number' && Number(NAT_MIN) <= value && value <= Number(NAT16_MAX);
export const isNat32 = (value: CandidValue): boolean =>
    typeof value === 'number' && Number(NAT_MIN) <= value && value <= Number(NAT32_MAX);
export const isNat64 = (value: CandidValue): boolean => {
    if (!isNat(value)) return false;
    const v = BigInt((value as any)['value']);
    return BigInt(`${NAT_MIN}`) <= v && v <= BigInt(NAT64_MAX);
};
export const isInt8 = (value: CandidValue): boolean =>
    typeof value === 'number' && Number(INT8_MIN) <= value && value <= Number(INT8_MAX);
export const isInt16 = (value: CandidValue): boolean =>
    typeof value === 'number' && Number(INT16_MIN) <= value && value <= Number(INT16_MAX);
export const isInt32 = (value: CandidValue): boolean =>
    typeof value === 'number' && Number(INT32_MIN) <= value && value <= Number(INT32_MAX);
export const isInt64 = (value: CandidValue): boolean => {
    if (!isInt(value)) return false;
    const v = BigInt((value as any)['value']);
    return BigInt(INT64_MIN) <= v && v <= BigInt(INT64_MAX);
};
export const isFloat32 = (value: CandidValue): boolean =>
    // typeof value === "number" && !!`${value}`.match(FLOAT32_REGEX);
    typeof value === 'number'; // ? decimal ???
export const isFloat64 = (value: CandidValue): boolean =>
    // typeof value === "number" && !!`${value}`.match(FLOAT64_REGEX);
    typeof value === 'number'; // ? decimal ???
export const isNull = (value: CandidValue): boolean => value === null;
export const isText = (value: CandidValue): boolean => typeof value === 'string';
export const isCandidPrincipal = (value: CandidValue): boolean =>
    typeof value === 'object' &&
    (value as any)['type'] === 'principal' &&
    isPrincipal((value as any)['value']);
export const isBlob = (value: CandidValue): boolean => {
    if (!isArray(value)) return false;
    const length = (value as any)['length'];
    if (typeof length !== 'number') return false;
    for (let i = 0; i < length; i++) if (!isNat8((value as any)[i])) return false;
    return true;
};
export const isVec = (value: CandidValue, subtype: CandidType, recItems: RecItem[]): boolean => {
    if (!isArray(value)) return false;
    const length = (value as any)['length'];
    if (typeof length !== 'number') return false;
    for (let i = 0; i < length; i++)
        if (!checkCandidValue(subtype, (value as any)[i], recItems)) return false;
    return true;
};
export const isOpt = (value: CandidValue, subtype: CandidType, recItems: RecItem[]): boolean => {
    if (!isArray(value)) return false;
    const length = (value as any)['length'];
    if (typeof length !== 'number') return false;
    switch (length) {
        case 0:
            return true;
        case 1:
            return checkCandidValue(subtype, (value as any)[0], recItems);
    }
    return false;
};
export const isRecord = (
    value: CandidValue,
    subitems: CandidTypeSubitem[],
    recItems: RecItem[],
): boolean => {
    if (typeof value !== 'object') return false;
    const valueKeys = Object.keys(value!);
    if (valueKeys.length !== subitems.length) return false;
    for (let i = 0; i < subitems.length; i++) {
        const subitem = subitems[i];
        if (!checkCandidValue(subitem.type, (value as any)[subitem.key], recItems)) return false;
        valueKeys.splice(
            valueKeys.findIndex((key) => key === subitem.key),
            1,
        );
    }
    return valueKeys.length === 0;
};
export const isVariant = (
    value: CandidValue,
    subitems: CandidTypeSubitem[],
    recItems: RecItem[],
): boolean => {
    if (typeof value !== 'object') return false;
    const valueKeys = Object.keys(value!);
    if (valueKeys.length > 1) return false;
    if (subitems.length > 0) {
        if (valueKeys.length > 0) {
            const key = valueKeys[0]; // the only key
            const findSubitems = subitems.filter((subitem) => subitem.key === key); // find the chosen key
            if (findSubitems.length !== 1) return false;
            const subitem = findSubitems[0];
            return checkCandidValue(subitem.type, (value as any)[key], recItems);
        } else {
            return false;
        }
    } else {
        if (valueKeys.length > 0) {
            return false;
        } else {
            return true;
        }
    }
};
export const isTuple = (
    value: CandidValue,
    subitems: CandidTypeSubitem[],
    recItems: RecItem[],
): boolean => {
    if (!isArray(value)) return false;
    const length = (value as any)['length'];
    if (typeof length !== 'number') return false;
    if (length !== subitems.length) return false;
    for (let i = 0; i < length; i++) {
        if (!checkCandidValue(subitems[i].type, (value as any)[i], recItems)) return false;
    }
    return true;
};
export const isCandidFunc = (value: CandidValue): boolean =>
    typeof value === 'object' &&
    (value as any)['type'] === 'func' &&
    typeof (value as any)['value'] === 'object' &&
    isCanisterId((value as any)['value']['service']) &&
    (value as any)['value']['method']; // ? method ???
export const isCandidService = (value: CandidValue): boolean =>
    typeof value === 'object' &&
    (value as any)['type'] === 'service' &&
    isCanisterId((value as any)['value']);

export const checkCandidValue = (
    type: CandidType,
    value: CandidValue,
    recItems: RecItem[],
): boolean => {
    if (value === undefined) return false;

    // console.error("checkCandidValue", type, value);

    switch (type.type) {
        case 'bool':
            return isBool(value);
        case 'nat':
            return isNat(value);
        case 'int':
            return isInt(value);
        case 'nat8':
            return isNat8(value);
        case 'nat16':
            return isNat16(value);
        case 'nat32':
            return isNat32(value);
        case 'nat64':
            return isNat64(value);
        case 'int8':
            return isInt8(value);
        case 'int16':
            return isInt16(value);
        case 'int32':
            return isInt32(value);
        case 'int64':
            return isInt64(value);
        case 'float32':
            return isFloat32(value);
        case 'float64':
            return isFloat64(value);
        case 'null':
            return isNull(value);
        case 'text':
            return isText(value);
        case 'principal':
            return isCandidPrincipal(value);
        case 'blob':
            return isBlob(value);
        case 'vec':
            return isVec(value, type.subtype, recItems);
        case 'opt':
            return isOpt(value, type.subtype, recItems);
        case 'record':
            return isRecord(value, type.subitems, recItems);
        case 'variant':
            return isVariant(value, type.subitems, recItems);
        case 'tuple':
            return isTuple(value, type.subitems, recItems);
        case 'rec':
            const { subtype: recSubtype, recItems: recItems2 } = findRecSubtype(type, recItems);
            return checkCandidValue(recSubtype, value, recItems2);
        case 'unknown':
            return false;
        case 'empty':
            return false;
        case 'reserved':
            return true; // any type
        case 'func':
            return isCandidFunc(value);
        case 'service':
            return isCandidService(value);
    }
};

export const checkCandidTypeAndCandidValue = (
    type: CandidType,
    value: CandidValue,
    recItems: RecItem[],
    el?: HTMLElement,
): DataResult<CandidValue> => {
    if (!checkCandidValue(type, value, recItems)) {
        return {
            err: {
                message: `value: ${JSON.stringify(value)} is not match type: ${stringifyCandidType(
                    type,
                )}`,
                el,
            },
        };
    }

    return { ok: value };
};

// ================== wrap value ==================

// unwrap candid value
// * CandidBigInt -> BigInt
// * CandidPrincipal -> Principal
export const unwrapCandidValue = (
    type: CandidType,
    value: CandidValue,
    recItems: RecItem[],
): any => {
    if (value === undefined) throw new Error('candid value can not be undefined');

    if (!checkCandidValue(type, value, [])) {
        throw new Error(
            `value: ${JSON.stringify(value)} is not match type: ${stringifyCandidType(type)}`,
        );
    }

    let v: any = value;

    switch (type.type) {
        case 'bool':
            break;
        case 'nat':
        case 'int':
            v = BigInt(v!['value']);
            break;
        case 'nat8':
        case 'nat16':
        case 'nat32':
            break;
        case 'nat64':
            v = BigInt(v!['value']);
            break;
        case 'int8':
        case 'int16':
        case 'int32':
            break;
        case 'int64':
            v = BigInt(v!['value']);
            break;
        case 'float32':
        case 'float64':
            break;
        case 'null':
            break;
        case 'text':
            break;
        case 'principal':
            v = Principal.fromText(v!['value']); // ! real type
            break;
        case 'blob':
            break;
        case 'vec':
            for (let i = 0; i < v!['length']; i++)
                v[i] = unwrapCandidValue(type.subtype, v[i], recItems);
            break;
        case 'opt':
            for (let i = 0; i < v!['length']; i++)
                v[i] = unwrapCandidValue(type.subtype, v[i], recItems);
            break;
        case 'record':
            for (let i = 0; i < type.subitems.length; i++) {
                const item = type.subitems[i];
                v[item.key] = unwrapCandidValue(item.type, v[item.key], recItems);
            }
            break;
        case 'variant':
            const variantValueKeys = Object.keys(v!);
            if (variantValueKeys.length) {
                const key = variantValueKeys[0];
                for (let i = 0; i < type.subitems.length; i++) {
                    if (key === type.subitems[i].key) {
                        v[key] = unwrapCandidValue(type.subitems[i].type, v[key], recItems);
                        break;
                    }
                }
            }
            break;
        case 'tuple':
            for (let i = 0; i < type.subitems.length; i++)
                v[i] = unwrapCandidValue(type.subitems[i].type, v[i], recItems);
            break;
        case 'rec':
            const { subtype: recSubtype, recItems: recItems2 } = findRecSubtype(type, recItems);
            return unwrapCandidValue(recSubtype, value, recItems2);
        case 'unknown':
        case 'empty':
        case 'reserved':
            break;
        case 'func':
            // actually, it is [ Principal, string ]
            v = [Principal.fromText(v!['value']['service']), v!['value']['method']];
            break;
        case 'service':
            // actually, it is Principal
            v = Principal.fromText(v!['value']); // ! real type
            break;
    }

    return v;
};

// wrap value
// * BigInt -> CandidBigInt
// *  Principal -> CandidPrincipal
export const wrapCandidValue = (type: CandidType, value: any, recItems: RecItem[]): CandidValue => {
    if (value === undefined) throw new Error('candid value can not be undefined');

    let v: CandidValue = value;

    switch (type.type) {
        case 'bool':
            break;
        case 'nat':
        case 'int':
            v = { type: 'bigint', value: `${v}` };
            break;
        case 'nat8':
        case 'nat16':
        case 'nat32':
            break;
        case 'nat64':
            v = { type: 'bigint', value: `${v}` };
            break;
        case 'int8':
        case 'int16':
        case 'int32':
            break;
        case 'int64':
            v = { type: 'bigint', value: `${v}` };
            break;
        case 'float32':
        case 'float64':
            break;
        case 'null':
            break;
        case 'text':
            break;
        case 'principal':
            v = { type: 'principal', value: value.toText() }; // ! to text
            break;
        case 'blob':
            break;
        case 'vec':
            for (let i = 0; i < (v as any)['length']; i++)
                (v as any)[i] = wrapCandidValue(type.subtype, (v as any)[i], recItems);
            break;
        case 'opt':
            for (let i = 0; i < (v as any)['length']; i++)
                (v as any)[i] = wrapCandidValue(type.subtype, (v as any)[i], recItems);
            break;
        case 'record':
            for (let i = 0; i < type.subitems.length; i++) {
                const item = type.subitems[i];
                (v as any)[item.key] = wrapCandidValue(item.type, (v as any)[item.key], recItems);
            }
            break;
        case 'variant':
            const variantValueKeys = Object.keys(v!);
            if (variantValueKeys.length) {
                const key = variantValueKeys[0];
                for (let i = 0; i < type.subitems.length; i++) {
                    if (key === type.subitems[i].key) {
                        (v as any)[key] = wrapCandidValue(
                            type.subitems[i].type,
                            (v as any)[key],
                            recItems,
                        );
                        break;
                    }
                }
            }
            break;
        case 'tuple':
            for (let i = 0; i < type.subitems.length; i++)
                (v as any)[i] = wrapCandidValue(type.subitems[i].type, (v as any)[i], recItems);
            break;
        case 'rec':
            const { subtype: recSubtype, recItems: recItems2 } = findRecSubtype(type, recItems);
            return wrapCandidValue(recSubtype, value, recItems2);
        case 'unknown':
        case 'empty':
        case 'reserved':
            break;
        case 'func':
            // actually, it is  [ Principal, string ]
            v = {
                type: 'func',
                value: {
                    service: Principal.fromUint8Array(parseUint8Array(value[0]['_arr'])).toText(),
                    method: value[1],
                },
            };
            break;
        case 'service':
            // actually, it is  Principal
            v = {
                type: 'service',
                value: Principal.fromUint8Array(parseUint8Array(value['_arr'])).toText(), // ! to text
            };
            break;
    }

    return v;
};

// for principal
const parseUint8Array = (arr: any): Uint8Array => {
    if (!isArray(arr)) throw new Error('arr is not array');

    const value: Uint8Array = new Uint8Array(arr.length);

    for (let i = 0; i < arr.length; i++) {
        value[i] = arr[i];
    }

    return value;
};
