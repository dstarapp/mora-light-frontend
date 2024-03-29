import {
    Float32CandidType,
    Float64CandidType,
    Int16CandidType,
    Int32CandidType,
    Int64CandidType,
    Int8CandidType,
    IntCandidType,
    Nat16CandidType,
    Nat32CandidType,
    Nat64CandidType,
    Nat8CandidType,
    NatCandidType,
    PrincipalCandidType,
    TextCandidType,
} from '../../../candid';

export type TextViewConstraint = {
    name: 'TextView'; // bool view

    // ? creating
    ui?: TextUI; // how to show ?
};

export type TextUI = {
    customLabel?: string;

    textAlign?: 'left' | 'center' | 'right';
    fontSize?: string;
    color?: string;
};

export type TextViewSupportedType =
    | NatCandidType
    | IntCandidType
    | Nat8CandidType
    | Nat16CandidType
    | Nat32CandidType
    | Nat64CandidType
    | Int8CandidType
    | Int16CandidType
    | Int32CandidType
    | Int64CandidType
    | Float32CandidType
    | Float64CandidType
    | TextCandidType
    | PrincipalCandidType;

export const getTextViewSupportedTypeList = (): TextViewSupportedType[] => {
    return [
        { type: 'text' },
        { type: 'principal' },
        { type: 'nat' },
        { type: 'int' },
        { type: 'nat8' },
        { type: 'nat16' },
        { type: 'nat32' },
        { type: 'nat64' },
        { type: 'int8' },
        { type: 'int16' },
        { type: 'int32' },
        { type: 'int64' },
        { type: 'float32' },
        { type: 'float64' },
    ];
};
