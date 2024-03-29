import { CandidType, CandidValue } from '../candid';
import { ExportedInfo, StringResult } from '../common';
import { Transform } from '../transform';

// data source 5 - user input
export type DataSourceInput = {
    source: 'input'; // input data source

    input: {
        // ! must has result type
        result: CandidType;
        // ? creating using
        ui?: InputUI; // help user to input
    };

    // ? creating
    transform?: Transform; // maybe needs transform
    // ? creating
    exported?: ExportedInfo; // export type is this source's result type

    // ? running
    runtime?: StringResult<CandidValue>;
};

export type InputUI = Record<string, any>;
