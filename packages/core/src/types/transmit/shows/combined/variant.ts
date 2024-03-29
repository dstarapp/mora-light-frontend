import { CandidType, CandidTypeSubitem, VariantCandidType } from '../../../candid';
import { deepClone } from '../../../common';

export type VariantViewSupportedType = VariantCandidType;

export type VariantViewConstraint = {
    name: 'VariantView'; // variant view

    // ? creating
    ui?: VariantUI; // how to show ?
};

export type VariantUI = Record<string, any>;

export const getVariantViewSupportedTypeList = (
    subitems: { key: string; types: CandidType[] }[],
): VariantCandidType[] => {
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
    return subitemsList.map((subitems) => ({ type: 'variant', subitems }));
};
