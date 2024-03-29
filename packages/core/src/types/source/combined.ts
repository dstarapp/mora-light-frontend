import { CandidValue, TupleCandidType } from '../candid';
import { ExportedInfo, StringResult } from '../common';
import { Transform } from '../transform';
import { ArgumentConstraint } from './arg';

// data source 7 - inner value and calculate
export type DataSourceCombined = {
    source: 'combined'; // combined data source

    combined: {
        from: TupleCandidType; // some inner values
        arg: ArgumentConstraint; // argument constraint
    };

    // ? creating
    transform: Transform; // must has transform
    // ? creating
    exported?: ExportedInfo; // export type is this source's result type

    // ? running
    runtime?: StringResult<CandidValue>;
};
