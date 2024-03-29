// basic candid type
export type BasicType =
    // boolean type: true false Motoko Bool / Rust bool / JavaScript true false
    | 'bool' // https://internetcomputer.org/docs/current/references/candid-ref/#type-bool

    // nature number: Motoko Nat / Rust candid:Nat or u128 / JavaScript BigInt(10000) or 10000n
    | 'nat' // https://internetcomputer.org/docs/current/references/candid-ref/#type-nat

    // integer number: Motoko Int / Rust candid::Int or i128 / JavaScript BigInt(-10000) or -10000n
    | 'int' // https://internetcomputer.org/docs/current/references/candid-ref/#type-int

    // integer with limit bits
    // https://internetcomputer.org/docs/current/references/candid-ref/#type-natn-and-intn
    | 'nat8'
    | 'nat16'
    | 'nat32'
    | 'nat64'
    | 'int8'
    | 'int16'
    | 'int32'
    | 'int64'

    // float number: Motoko Float is 64 bits / Rust f32 f64 / JavaScript float
    // https://internetcomputer.org/docs/current/references/candid-ref/#type-float32-and-float64
    | 'float32'
    | 'float64'

    // null type: only value is null Motoko Null / Rust None / JavaScript null
    | 'null' // https://internetcomputer.org/docs/current/references/candid-ref/#type-null

    // text type: Motoko Text / Rust String or &str / JavaScript string
    | 'text' // https://internetcomputer.org/docs/current/references/candid-ref/#type-text

    // principal type: like "zwigo-aiaaa-aaaaa-qaa3a-cai" Motoko Principal / candid::Principal / JavaScript Principal.fromText("aaaaa-aa")
    | 'principal'; // https://internetcomputer.org/docs/current/references/candid-ref/#type-principal

// type with subtype
export type SubtypeType =
    // must has subtype
    // binary data: vec nat8 Motoko Blob / Rust Vec<u8> or &[u8] / JavaScript [1, 2, 3]
    | 'blob' // https://internetcomputer.org/docs/current/references/candid-ref/#type-blob

    // must has subtype
    // array of some type: vec {1,3} Motoko [T] / Rust Vec<T> &[T] / JavaScript Array
    | 'vec' // https://internetcomputer.org/docs/current/references/candid-ref/#type-vec-t

    // must has subtype
    // option type: null opt t Motoko ?T / Rust Option<T> / [] [t]
    | 'opt'; // https://internetcomputer.org/docs/current/references/candid-ref/#type-opt-t

// type with subitems
export type SubitemsType =
    // must has subitems
    // object type: record { name="123"; } Motoko record { name: "123" } / Rust struct / JavaScript object
    | 'record' // https://internetcomputer.org/docs/current/references/candid-ref/#type-record--n--t--

    // must has subitems
    // enumerate type: variant { ok : nat; error : text } / Rust enum / JavaScript { dot: null }
    | 'variant' // https://internetcomputer.org/docs/current/references/candid-ref/#type-variant--n--t--

    // must has subitems
    // tuple type: subitem has no name
    | 'tuple'; // JavaScript array value

// special type
export type SpecialType =
    // object type: some subtype or subitem is recursion
    | 'rec' // JavaScript object value
    // unknown type
    | 'unknown'
    // empty type
    | 'empty' // https://internetcomputer.org/docs/current/references/candid-ref/#type-empty
    // reserved type: some function arguments can be ignore
    | 'reserved' // https://internetcomputer.org/docs/current/references/candid-ref/#type-reserved
    // function type
    | 'func' // https://internetcomputer.org/docs/current/references/candid-ref/#type-func---
    // service type: canister's api
    | 'service'; // https://internetcomputer.org/docs/current/references/candid-ref/#type-service-

// all supported candid type
export type SupportedCandidType = BasicType | SubtypeType | SubitemsType | SpecialType;

export type CandidTypeSubitem = { key: string; type: CandidType };
export type CandidTypeApiItem = { method: string; func: FuncCandidType };

export type BoolCandidType = {
    type: 'bool';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type NatCandidType = {
    type: 'nat';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type IntCandidType = {
    type: 'int';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type Nat8CandidType = {
    type: 'nat8';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type Nat16CandidType = {
    type: 'nat16';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type Nat32CandidType = {
    type: 'nat32';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type Nat64CandidType = {
    type: 'nat64';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type Int8CandidType = {
    type: 'int8';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type Int16CandidType = {
    type: 'int16';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type Int32CandidType = {
    type: 'int32';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type Int64CandidType = {
    type: 'int64';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type Float32CandidType = {
    type: 'float32';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type Float64CandidType = {
    type: 'float64';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type NullCandidType = {
    type: 'null';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type TextCandidType = {
    type: 'text';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type PrincipalCandidType = {
    type: 'principal';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};

export type BlobCandidType = {
    type: 'blob';
    subtype: { type: 'nat8' }; // must has subtype, must be nat8
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type VecCandidType = {
    type: 'vec';
    subtype: CandidType; // must has subtype
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type OptCandidType = {
    type: 'opt';
    subtype: CandidType; //  must has subtype
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};

export type RecordCandidType = {
    type: 'record';
    subitems: CandidTypeSubitem[]; // must has subitems
    subtype?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type VariantCandidType = {
    type: 'variant';
    subitems: CandidTypeSubitem[]; // must has subitems
    subtype?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type TupleCandidType = {
    type: 'tuple';
    subitems: CandidTypeSubitem[]; // must has subitems，the key like _xxx_
    subtype?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};

// recursion type
export type MainRecCandidType = {
    type: 'rec';
    id: number; // has id for marking itself
    subtype: CandidType; // reality type
    subitems?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type SubRecCandidType = {
    type: 'rec';
    id: number; // has id for super type
    subtype?: undefined; // must be undefined
    subitems?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};
export type RecCandidType = MainRecCandidType | SubRecCandidType;

// unknown type
export type UnknownCandidType = {
    type: 'unknown';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};

// empty type, should never see this type
export type EmptyCandidType = {
    type: 'empty';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};

// reserved type, don't care
export type ReservedCandidType = {
    type: 'reserved';
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
    apis?: undefined;
};

// function type
export type FuncCandidType = {
    type: 'func';
    annotations: [] | ['query']; // annotations of function
    argTypes: TupleCandidType; // argument
    retTypes: TupleCandidType; // return
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    apis?: undefined;
};

// service type
export type ServiceCandidType = {
    type: 'service';
    apis: CandidTypeApiItem[]; // has some function
    subtype?: undefined;
    subitems?: undefined;
    id?: undefined;
    annotations?: undefined;
    argTypes?: undefined;
    retTypes?: undefined;
};

// candid type
export type CandidType =
    // basic type
    | BoolCandidType
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
    | NullCandidType
    | TextCandidType
    | PrincipalCandidType
    // subtype
    | BlobCandidType
    | VecCandidType
    | OptCandidType
    // subitems
    | RecordCandidType
    | VariantCandidType
    | TupleCandidType
    // special type
    | RecCandidType
    | UnknownCandidType
    | EmptyCandidType
    | ReservedCandidType
    | FuncCandidType
    | ServiceCandidType;

// candid type list
export const CANDID_TYPE_LIST: SupportedCandidType[] = [
    'bool',
    'nat',
    'int',
    'nat8',
    'nat16',
    'nat32',
    'nat64',
    'int8',
    'int16',
    'int32',
    'int64',
    'float32',
    'float64',
    'null',
    'text',
    'principal',
    'blob',
    'vec',
    'opt',
    'record',
    'variant',
    'tuple',
    'rec',
    'unknown',
    'empty',
    'reserved',
    'func',
    'service',
];
