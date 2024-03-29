import { TupleCandidType, CanisterText, Extra, CandidValue } from '../candid';
import { ExportedInfo, StringResult } from '../common';
import { Transform } from '../transform';
import { ArgumentConstraint } from './arg';

// data source 8 - from other light
export type DataSourceLight = {
    source: 'light'; // light data source

    light: {
        info: LightInfo;
        arg: ArgumentConstraint; // argument constraint
    };

    // ? creating
    transform?: Transform; // maybe needs transform
    // ? creating
    exported?: ExportedInfo; // export type is this source's result type

    // ? running
    runtime?: StringResult<CandidValue>;
};

// light info
export type LightInfo = {
    canister_id: CanisterText; // which canister
    hash: string; // id
    arg: TupleCandidType; // trimmed light arguments
    result: TupleCandidType; // results
    child?: number; // abstract child value if result is alone type
    extra: Extra;
};
