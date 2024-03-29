import { CandidType, TupleCandidType } from '../candid';
import { ExportedOuter } from '../common';
import { Transform } from '../transform';

// transmits 1 - exported outer
export type DataTransmitExportedOuter = {
    transmit: 'outer';
    // exported type
    // 1. transform to type if transform exists
    // 2. child type if from is alone type
    // 3. from type
    type: CandidType;

    from: TupleCandidType; // data source result
    child?: number; // abstract child value if result is alone type

    // ? creating
    transform?: Transform; // maybe needs transform
    // ? creating
    exported: ExportedOuter; // export type is this source's result type
};
