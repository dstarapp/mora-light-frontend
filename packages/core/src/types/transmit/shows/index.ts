import { SingleTransmitShowView, SupportedBasicShowName } from './basic';
import { CombinedTransmitShowView, SupportedCombinedShowName } from './combined';

export * from './basic';
export * from './combined';

export type SupportedShowName = SupportedBasicShowName | SupportedCombinedShowName;

// list
export const SHOW_TYPE_LIST: SupportedShowName[] = [
    'BoolView',
    'TextView',
    'ImageView',
    'TableView',
    'VecView',
    'OptView',
    'RecordView',
    'VariantView',
    'TupleView',
];

export type UnionTransmitShowView = SingleTransmitShowView | CombinedTransmitShowView;
