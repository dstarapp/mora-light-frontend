import { CandidType, CandidTypeSubitem, RecordCandidType } from '../../../candid';
import { deepClone } from '../../../common';

export type RecordViewSupportedType = RecordCandidType;

export type RecordViewConstraint = {
    name: 'RecordView'; // record view

    // ? creating
    ui?: RecordUI; // how to show ?
};

export type RecordUI = {
    customLabel?: string;

    flexDirection?: 'column' | 'row';
};

export const getRecordViewSupportedTypeList = (
    subitems: { key: string; types: CandidType[] }[],
): RecordCandidType[] => {
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
    return subitemsList.map((subitems) => ({ type: 'record', subitems }));
};
