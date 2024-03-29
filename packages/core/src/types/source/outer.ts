import { CandidType, CandidValue, Extra } from '../candid';
import { ExportedInfo, StringResult } from '../common';
import { Transform } from '../transform';

// data source 1 - from previous light
// some value can be from other light
// for example: user can input name on first light and next light can use this variable value by outer data source
export type DataSourceOuter = {
    source: 'outer'; // outer data source

    outer: {
        // ! must has result type
        result: CandidType;
        // ? creating
        label?: string; // tips
        // ? using
        using: string; // id for fetch data from prop
        name?: string; // ! must has name on using
        extra?: Extra; // metadata of value
    };

    // ? creating
    transform?: Transform; // maybe needs transform
    // ? creating
    exported?: ExportedInfo; // export type is this source's result type

    // ? running
    runtime?: StringResult<CandidValue>;
};
