import { CandidType, CandidValue } from '../candid';
import { ExportedInfo, StringResult } from '../common';
import { Transform } from '../transform';

// data source 4 - from constant
// some values are constant and would not change on running
export type DataSourceConstant = {
    source: 'constant'; // constant data source

    constant: {
        // ! must has result type
        result: CandidType;
        // ? creating
        value: CandidValue;
    };

    // ? creating
    transform?: Transform; // maybe needs transform
    // ? creating
    exported?: ExportedInfo; // export type is this source's result type

    // ? running
    runtime?: StringResult<CandidValue>;
};
