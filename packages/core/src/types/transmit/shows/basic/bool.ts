import { BoolCandidType } from '../../../candid';

export type BoolViewConstraint = {
    name: 'BoolView'; // bool view

    // ? creating
    ui?: BoolUI; // how to show ?
};

export type BoolUI = {
    customLabel?: string;

    customTrueText?: string;
    customFalseText?: string;
};

export type BoolViewSupportedType = BoolCandidType;

export const getBoolViewSupportedTypeList = (): BoolViewSupportedType[] => {
    return [{ type: 'bool' }];
};
