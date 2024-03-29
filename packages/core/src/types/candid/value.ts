import { StringResult } from '../common';

// special value, some value of candid type is bigint
export type CandidBigInt = {
    type: 'bigint';
    value: string; // number string
};

export type PrincipalText = string;
export type CanisterText = string;

// special value
export type CandidPrincipal = {
    type: 'principal';
    value: PrincipalText; // text principal, like aaaaa-aa
};

export type CandidFuncValue = {
    service: CanisterText; // which canister ?
    method: string; // which method ?
};

// special value
export type CandidFunc = {
    type: 'func';
    value: CandidFuncValue;
};

// special value
export type CandidService = {
    type: 'service';
    value: CanisterText; // which canister ?
};

// support decimal of float type
export type Float32Decimal = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Float64Decimal = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

// value type of javascript
type CandidValuePrimitive =
    | boolean // bool: true or false
    | number // nat8 nat16 nat32 int8 int16 int32 // ! float32 float64 maybe float type cloud be wrong
    | CandidBigInt // nat int nat64 int64
    | null // null opt reserved
    | string // text
    | CandidPrincipal // principal
    | CandidFunc // func
    | CandidService; // service
// blob number[]
// vec
// opt [] and [value]
// tuple
interface CandidValueArray extends Array<CandidValue> {}
// record
// variant: at most one subitem
export type CandidValueObject = { [member: string]: CandidValue };

// candid value
export type CandidValue = CandidValuePrimitive | CandidValueObject | CandidValueArray;

// ================ metadata for some value ================

export type ExtraConstant = {
    constant: true;
    // ? creating
    runtime: { ok: CandidValue }; // constant value
};
export type ExtraDynamic = {
    constant: false;
    // ? running
    runtime?: StringResult<CandidValue>;
};

export type Extra = ExtraConstant | ExtraDynamic;
