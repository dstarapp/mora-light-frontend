import { CandidType, MainRecCandidType, RecCandidType } from './candid';
import { CandidValue } from './value';
import { stringifyCandidType } from './wraps';

export type RecItem = { id: number; type: MainRecCandidType };

// initial value for candid type
export const getInitialCandidTypeValue = (
    type: CandidType,
    recItems: RecItem[],
    requested: string[],
): CandidValue => {
    const subitems = type.subitems ?? [];
    switch (type.type) {
        case 'bool':
            return false;
        case 'nat':
        case 'int':
            return { type: 'bigint', value: '0' };
        case 'nat8':
        case 'nat16':
        case 'nat32':
            return 0;
        case 'nat64':
            return { type: 'bigint', value: '0' };
        case 'int8':
        case 'int16':
        case 'int32':
            return 0;
        case 'int64':
            return { type: 'bigint', value: '0' };
        case 'float32':
        case 'float64':
            return 0.0;
        case 'null':
            return null;
        case 'text':
            return '';
        case 'principal':
            return { type: 'principal', value: '' }; // ! it is not a correct value
        case 'blob':
            return [];
        case 'vec':
            return [];
        case 'opt':
            return []; // none
        case 'record':
            const record: Record<string, CandidValue> = {};
            subitems.forEach(
                (subitem) =>
                    (record[subitem.key] = getInitialCandidTypeValue(
                        subitem.type,
                        recItems,
                        requested,
                    )),
            ); // every key has value
            return record;
        case 'variant':
            const variant: Record<string, CandidValue> = {};
            for (let i = 0; i < subitems.length; i++) {
                variant[subitems[i].key] = getInitialCandidTypeValue(
                    subitems[i].type,
                    recItems,
                    requested,
                );
                break; // one is enough
            }
            return variant;
        case 'tuple':
            return subitems.map((subitem) =>
                getInitialCandidTypeValue(subitem.type, recItems, requested),
            ); // every key has value
        case 'rec':
            const request = stringifyCandidType(type);
            if (requested.includes(request)) {
                console.error('recursive object can not be instanced', requested, request, type);
                throw new Error(
                    `recursive object can not be instanced: ${stringifyCandidType(type)}`,
                );
            }
            requested = [...requested, request];

            const { subtype: recSubtype, recItems: recItems2 } = findRecSubtype(type, recItems);

            return getInitialCandidTypeValue(recSubtype, recItems2, requested);
        case 'unknown':
            throw new Error(`can not instanced for type 'unknown'`);
        case 'empty':
            throw new Error(`can not instanced for type 'empty'`);
        case 'reserved':
            return null;
        case 'func':
            return {
                type: 'func',
                value: {
                    service: '', // ! it is not a correct value
                    method: '', // ! it is not a correct value
                },
            };
        case 'service':
            return {
                type: 'service',
                value: '', // ! it is not a correct value
            };
    }
};

export const findRecType = (recItems: RecItem[], id: number): MainRecCandidType | undefined => {
    for (let i = recItems.length - 1; 0 <= i; i--) {
        if (recItems[i].id === id) return recItems[i].type;
    }
    return undefined;
};

export const findRecSubtype = (
    type: RecCandidType,
    recItems: RecItem[],
): {
    subtype: CandidType;
    recItems: RecItem[];
} => {
    const found = findRecType(recItems, type.id);
    let recSubType: CandidType;
    if (found !== undefined) {
        if (type.subtype !== undefined) {
            recSubType = type.subtype;
            recItems = [...recItems, { id: type.id, type }];
        } else {
            recSubType = found.subtype;
        }
    } else {
        if (type.subtype !== undefined) {
            recSubType = type.subtype;
            recItems = [...recItems, { id: type.id, type }];
        } else {
            throw new Error(`wrong recursive type: ${stringifyCandidType(type)}`);
        }
    }
    return { subtype: recSubType, recItems };
};
