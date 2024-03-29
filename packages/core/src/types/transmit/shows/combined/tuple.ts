import { CandidType, CandidTypeSubitem, TupleCandidType } from '../../../candid';
import { deepClone } from '../../../common';

export type TupleViewSupportedType = TupleCandidType;

export type TupleViewConstraint = {
    name: 'TupleView'; // tuple view

    // ? creating
    ui?: TupleUI; // how to show ?
};

export type TupleUI = Record<string, any>;

export const getTupleViewSupportedTypeList = (
    subitems: { key: string; types: CandidType[] }[],
): TupleCandidType[] => {
    let subitemsList: CandidTypeSubitem[][] = [];
    for (const { key, types } of subitems) {
        if (!subitemsList.length) {
            for (const type of types) {
                subitemsList.push([{ key, type: deepClone(type) }]);
            }
        } else {
            let subitemsList2: CandidTypeSubitem[][] = [];
            for (const type of types) {
                for (const subitems of subitemsList) {
                    subitemsList2.push([...deepClone(subitems), { key, type: deepClone(type) }]);
                }
            }
            subitemsList = subitemsList2;
        }
    }
    return subitemsList.map((subitems) => ({ type: 'tuple', subitems }));
};
