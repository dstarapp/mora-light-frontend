import { CandidType, CandidValue } from '../../../candid';
import { StringResult } from '../../../common';
import { BoolViewConstraint } from './bool';
import { ImageViewConstraint } from './image';
import { TableViewConstraint } from './table';
import { TextViewConstraint } from './text';

export * from './bool';
export * from './image';
export * from './table';
export * from './text';

// supported show type
export type SupportedBasicShowName = 'BoolView' | 'TextView' | 'ImageView' | 'TableView';

export type BasicShowViewConstraint =
    | BoolViewConstraint
    | TextViewConstraint
    | ImageViewConstraint
    | TableViewConstraint;

// single box
export type SingleTransmitShowView = {
    from: CandidType; // data source result

    subtype?: undefined;
    subitems?: undefined;
    constraint: BasicShowViewConstraint; // show constraint

    // ? running
    runtime?: StringResult<CandidValue>;
};
