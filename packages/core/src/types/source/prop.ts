import { CandidType, CandidValue, Extra } from '../candid';
import { ExportedInfo, StringResult } from '../common';
import { Transform } from '../transform';

// data source 2 - from light props
// some value can be from this light's props
// for example: user can use light and set props for running and this light can use props
export type DataSourceProp = {
    source: 'prop'; // prop data source

    prop: {
        // ! must has result type
        result: CandidType;
        // ? creating
        label?: string;
        tip?: string; // tips
        // ? creating
        name: string; // ! must has name on creating
    };

    // ? creating
    transform?: Transform; // maybe needs transform
    // ? creating
    exported?: ExportedInfo; // export type is this source's result type

    // ? running
    runtime?: StringResult<CandidValue>;
};
