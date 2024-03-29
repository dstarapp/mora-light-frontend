import { CandidType, VecCandidType } from '../../../candid';
import { deepClone } from '../../../common';

export type VecViewSupportedType = VecCandidType;

export type VecViewConstraint = {
    name: 'VecView'; // vec view

    // ? creating
    ui?: VecUI; // how to show ?
};

export type VecUI = {
    customLabel?: string;

    flexDirection?: 'column' | 'row';
};

export const getVecViewSupportedTypeList = (subtypeList: CandidType[]): VecCandidType[] => {
    return subtypeList.map((subtype) => ({
        type: 'vec',
        subtype: deepClone(subtype),
    }));
};
