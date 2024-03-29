import { UnionTransmitShowView } from '..';
import { CandidType, CandidValue } from '../../../candid';
import { VecViewConstraint } from './vec';
import { OptViewConstraint } from './opt';
import { RecordViewConstraint } from './record';
import { VariantViewConstraint } from './variant';
import { TupleViewConstraint } from './tuple';
import { StringResult } from '../../../common';

export * from './vec';
export * from './opt';
export * from './record';
export * from './variant';
export * from './tuple';

// supported show type
export type SupportedSubtypeShowName = 'VecView' | 'OptView';
export type SupportedSubItemsShowName = 'RecordView' | 'VariantView' | 'TupleView';
export type SupportedCombinedShowName = SupportedSubtypeShowName | SupportedSubItemsShowName;

export type SubtypeShowViewConstraint = VecViewConstraint | OptViewConstraint;

export type SubitemsShowViewConstraint =
    | RecordViewConstraint
    | VariantViewConstraint
    | TupleViewConstraint;

export type CombinedShowViewSubitem = { key: string; view: UnionTransmitShowView };

export type CombinedTransmitShowView =
    | {
          from: CandidType; // data source result

          subtype: UnionTransmitShowView;
          subitems?: undefined;
          constraint: SubtypeShowViewConstraint; // show constraint

          // ? running
          runtime?: StringResult<CandidValue>;
      }
    | {
          from: CandidType; // data source result

          subtype?: undefined;
          subitems: CombinedShowViewSubitem[];
          constraint: SubitemsShowViewConstraint; // show constraint

          // ? running
          runtime?: StringResult<CandidValue>;
      };
