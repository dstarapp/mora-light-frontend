import { CandidType, CandidTypeApiItem, CandidTypeSubitem } from './candid';

export const copyCandidType = <T extends CandidType>(type: T): T => {
    let r: T;
    switch (type.type) {
        case 'bool':
        case 'nat':
        case 'int':
        case 'nat8':
        case 'nat16':
        case 'nat32':
        case 'nat64':
        case 'int8':
        case 'int16':
        case 'int32':
        case 'int64':
        case 'float32':
        case 'float64':
        case 'null':
        case 'text':
        case 'principal':
            r = { type: type.type } as T;
            break;
        case 'blob':
            r = { type: type.type, subtype: { type: 'nat8' } } as T;
            break;
        case 'vec':
            r = { type: type.type, subtype: copyCandidType(type.subtype) } as T;
            break;
        case 'opt':
            r = { type: type.type, subtype: copyCandidType(type.subtype) } as T;
            break;
        case 'record':
        case 'variant':
        case 'tuple':
            r = {
                type: type.type,
                subitems: copyCandidTypeSubitems(type.subitems),
            } as T;
            break;
        case 'rec':
            r = {
                type: type.type,
                subtype: type.subtype !== undefined ? copyCandidType(type.subtype) : undefined,
                id: type.id,
            } as T;
            break;
        case 'unknown':
        case 'empty':
        case 'reserved':
            r = { type: type.type } as T;
            break;
        case 'func':
            r = {
                type: type.type,
                annotations: [...type.annotations],
                argTypes: copyCandidType(type.argTypes),
                retTypes: copyCandidType(type.retTypes),
            } as T;
            break;
        case 'service':
            r = {
                type: type.type,
                apis: type.apis.map((api) => {
                    return {
                        method: api.method,
                        func: {
                            type: api.func.type,
                            annotations: [...api.func.annotations],
                            argTypes: copyCandidType(api.func.argTypes),
                            retTypes: copyCandidType(api.func.retTypes),
                        },
                    };
                }),
            } as T;
            break;
    }

    return r;
};

const copyCandidTypeSubitems = (subitems: CandidTypeSubitem[]): CandidTypeSubitem[] => {
    return subitems.map((subitem) => {
        return {
            key: subitem.key,
            type: copyCandidType(subitem.type)!,
        };
    });
};
export const copyCandidTypeWithUndefined = (type: CandidType | undefined): CandidType | undefined =>
    type !== undefined ? copyCandidType(type) : undefined;

export const copyCandidTypeSubitemsWithUndefined = (
    subitems: CandidTypeSubitem[] | undefined,
): CandidTypeSubitem[] | undefined => (subitems ? copyCandidTypeSubitems(subitems) : undefined);

const copyCandidTypeApiItems = (apis: CandidTypeApiItem[]): CandidTypeApiItem[] => {
    return apis.map((api) => {
        return {
            method: api.method,
            func: copyCandidType(api.func)!,
        };
    });
};

export const copyCandidTypeApiItemsWithUndefined = (
    apiItems: CandidTypeApiItem[] | undefined,
): CandidTypeApiItem[] | undefined => (apiItems ? copyCandidTypeApiItems(apiItems) : undefined);
