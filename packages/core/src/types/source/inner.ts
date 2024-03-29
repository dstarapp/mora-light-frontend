import { CandidType, CandidValue, Extra } from '../candid';
import { ExportedInfo, StringResult } from '../common';
import { Transform } from '../transform';

// data source 3 - from this light
// some value can be from this light
// for example: some value from user can be used twice
export type DataSourceInner = {
    source: 'inner'; // inner data source

    inner: {
        // ? creating
        name: string; // ! must be unique
        // ! must has result type
        result: CandidType;
        // ? creating
        extra: Extra; // metadata of value
    };

    // ? creating
    transform?: Transform; // maybe needs transform
    // ? creating
    exported?: ExportedInfo; // export type is this source's result type

    // ? running
    runtime?: StringResult<CandidValue>;
};
