import { Principal } from '@dfinity/principal';
import { CandidType, CandidTypeSubitem, TupleCandidType } from './candid';
import { CanisterText, PrincipalText } from './value';
import { deepClone, isSame, isSameNumber } from '../common';

// parse candid type array to tuple candid type
export const parseTuple = (types: CandidType[]): TupleCandidType => {
    const subitems: CandidTypeSubitem[] = [];
    for (let i = 0; i < types.length; i++) subitems[i] = { key: `_${i}_`, type: types[i] };
    return { type: 'tuple', subitems };
};

// check text of principal
export const isPrincipal = (text: PrincipalText): boolean => {
    try {
        Principal.fromText(text);
    } catch (e) {
        // console.error("principal from text", e);
        return false;
    }
    return true;
};

// check text of canister id
export const isCanisterId = (text: CanisterText): boolean => {
    if (!isPrincipal(text)) return false;
    return text.length === 27;
};

// find alone type
export const findAloneType = (type: CandidType): { type: CandidType; child: number } => {
    if (type.type !== 'tuple') return { type: deepClone(type), child: 0 };
    if (type.subitems.length !== 1) return { type: deepClone(type), child: 0 };
    const r = findAloneType(type.subitems[0].type);
    return { type: r.type, child: r.child + 1 };
};

// find alone type
export const findChildType = (type: CandidType, child: number): CandidType => {
    if (child === 0) return deepClone(type);
    if (type.type !== 'tuple') throw new Error(`can not abstract child type: not tuple candid`);
    if (type.subitems.length !== 1) throw new Error(`can not abstract child type: not alone`);
    return findChildType(type.subitems[0].type, child - 1);
};

// get empty tuple candid type
export const getEmptyTupleCandidType = (): TupleCandidType => {
    return { type: 'tuple', subitems: [] };
};

// compare two candid type
export const isSameCandidType = (type1: CandidType | undefined, type2: CandidType): boolean =>
    isSameCandidTypeInner(type1, type2, [], []);
const isSameCandidTypeInner = (
    type1: CandidType | undefined,
    type2: CandidType,
    rec1: number[],
    rec2: number[],
): boolean => {
    if (!type1) return true; // ! if left type is undefined

    // ! some types have different type
    // * situation 1: blob and vec nat8 are same type
    if (
        type1.subtype &&
        type2.subtype &&
        isSameCandidType({ type: 'nat8' }, type1.subtype) &&
        isSameCandidType({ type: 'nat8' }, type2.subtype) &&
        ['blob', 'vec'].includes(type1.type) &&
        ['blob', 'vec'].includes(type2.type)
    ) {
        return true;
    }
    // * situation 2: record and variant type actually does not care order of fields
    if (
        type1.subitems &&
        type2.subitems &&
        type1.subitems.length === type2.subitems.length &&
        ((type1.type === 'record' && type2.type === 'record') ||
            (type1.type === 'variant' && type2.type === 'variant'))
    ) {
        // check fields
        if (
            ((): boolean => {
                const keys1 = type1.subitems.map((item) => item.key);
                const keys2 = type2.subitems.map((item) => item.key);
                for (const key of keys1) if (!keys2.includes(key)) return false;
                for (const key of keys2) if (!keys1.includes(key)) return false;
                for (const key of keys1) {
                    const index1 = type1.subitems.findIndex((subitem) => subitem.key === key);
                    const index2 = type2.subitems.findIndex((subitem) => subitem.key === key);
                    const subtype1 = type1.subitems[index1].type;
                    const subtype2 = type2.subitems[index2].type;
                    if (!isSameCandidType(subtype1, subtype2)) return false;
                }
                return true;
            })()
        )
            return true;
    }

    if (type1.type !== type2.type) return false; // main type

    // subtype
    if (
        !isSame(type1.subtype, type2.subtype, (t1, t2) =>
            isSameCandidTypeInner(
                t1,
                t2,
                type1.type !== 'rec' ? rec1 : [...rec1, type1.id],
                type1.type !== 'rec' ? rec2 : [...rec2, type2.id!],
            ),
        )
    ) {
        return false;
    }

    // subitems
    if (
        !isSame(type1.subitems, type2.subitems, (items1, items2) => {
            if (items1.length !== items2.length) return false; // length

            for (let i = 0; i < items1.length; i++) {
                if (
                    items1[i].key !== items2[i].key || // key
                    !isSameCandidTypeInner(items1[i].type, items2[i].type, rec1, rec2) // subitem subtype
                ) {
                    return false;
                }
            }
            return true;
        })
    ) {
        return false;
    }

    // id
    if (type1.type !== 'rec') {
        if (!isSameNumber(type1.id, type2.id)) return false;
    } else {
        // recent id
        if (!isSame(type1.id, type2.id, () => true)) return false;
        const index1 = rec1.lastIndexOf(type1.id);
        const index2 = rec2.lastIndexOf(type2.id!);
        if (index1 !== index2) return false;
    }

    // func
    if (!isSame(type1.annotations, type2.annotations)) return false;
    if (
        !isSame(type1.argTypes, type2.argTypes, (t1, t2) =>
            isSameCandidTypeInner(t1, t2, rec1, rec2),
        )
    )
        return false;
    if (
        !isSame(type1.retTypes, type2.retTypes, (t1, t2) =>
            isSameCandidTypeInner(t1, t2, rec1, rec2),
        )
    )
        return false;

    // service
    if (
        !isSame(type1.apis, type2.apis, (apis1, apis2) => {
            if (apis1.length !== apis2.length) return false; // length

            for (let i = 0; i < apis1.length; i++) {
                if (
                    apis1[i].method !== apis2[i].method || // method name
                    !isSameCandidTypeInner(apis1[i].func, apis2[i].func, rec1, rec2)
                ) {
                    return false;
                }
            }
            return true;
        })
    ) {
        return false;
    }

    return true;
};
