import { CandidType, OptCandidType } from '../../../candid';
import { deepClone } from '../../../common';

export type OptViewSupportedType = OptCandidType;

export type OptViewConstraint = {
    name: 'OptView'; // opt view

    // ? creating
    ui?: OptUI; // how to show ?
};

export type OptUI = Record<string, any>;

export const getOptViewSupportedTypeList = (subtypeList: CandidType[]): OptCandidType[] => {
    return subtypeList.map((subtype) => ({
        type: 'opt',
        subtype: deepClone(subtype),
    }));
};
