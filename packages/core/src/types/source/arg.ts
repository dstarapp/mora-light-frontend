import { DataSource } from './index';
import {
    BlobCandidType,
    CandidType,
    OptCandidType,
    RecordCandidType,
    TupleCandidType,
    VariantCandidType,
    VecCandidType,
    MainRecCandidType,
} from '../candid';

// argument constraint
export type ArgumentConstraint =
    | {
          type: CandidType;
          constraint: ForceArgumentConstraint;
      }
    | {
          type: BlobCandidType;
          constraint: BlobArgumentConstraint;
      }
    | {
          type: VecCandidType;
          constraint: VecArgumentConstraint;
      }
    | {
          type: OptCandidType;
          constraint: OptArgumentConstraint;
      }
    | {
          type: RecordCandidType;
          constraint: RecordArgumentConstraint;
      }
    | {
          type: VariantCandidType;
          constraint: VariantArgumentConstraint;
      }
    | {
          type: TupleCandidType;
          constraint: TupleArgumentConstraint;
      }
    | {
          type: MainRecCandidType;
          constraint: MainRecArgumentConstraint;
      };

export type ArgumentConstraintValue =
    | ForceArgumentConstraint
    | BlobArgumentConstraint
    | VecArgumentConstraint
    | OptArgumentConstraint
    | RecordArgumentConstraint
    | VariantArgumentConstraint
    | TupleArgumentConstraint;

// custom argument constraint or use default
export type ArrayArgumentConstraintSubitem =
    | {
          type: 'custom';
          constraint: ArgumentConstraint;
      }
    | {
          type: 'default';
          constraint?: undefined; // ? creating
      };

// force constraint
export type ForceArgumentConstraint = {
    type: 'force'; // from data source
    // ? creating
    source: DataSource;
};

// blob constraint
// 1. constant is 0 or positive means the length is constant
// 2. constant is -1 means dynamic length
export type BlobArgumentConstraint =
    | {
          type: 'blob';
          // ? creating
          constant: 0;
          length?: undefined;
          subitems?: undefined; // known constraint
          default?: undefined; // default is force DataSourceInput
          using?: undefined; // id for fetch data from prop
          subitems2?: undefined;
      }
    | {
          type: 'blob';
          // ? creating
          constant: number;
          length?: undefined;
          subitems: ArrayArgumentConstraintSubitem[]; // known constraint
          default: ArgumentConstraint; // default is force DataSourceInput
          // ? using cloud replace subitems
          using: string; // id for fetch data from prop
          subitems2?: ArgumentConstraint[];
      }
    | {
          type: 'blob';
          // ? creating
          constant: number;
          length: DataSource; // { type: 'nat32' }
          subitems: ArrayArgumentConstraintSubitem[]; // known constraint
          default: ArgumentConstraint; // default is force DataSourceInput
          // ? using cloud replace subitems
          using: string; // id for fetch data from prop
          subitems2?: ArgumentConstraint[];
      };

// vec constraint
// 1. constant is 0 or positive means the length is constant
// 2. constant is -1 means dynamic length
export type VecArgumentConstraint =
    | {
          type: 'vec';
          // ? creating
          constant: 0;
          length?: undefined;
          subitems?: undefined; // known constraint
          default?: undefined; // default is force DataSourceInput
          using?: undefined; // id for fetch data from prop
          subitems2?: undefined;
      }
    | {
          type: 'vec';
          // ? creating
          constant: number;
          length?: undefined;
          subitems: ArrayArgumentConstraintSubitem[]; // known constraint
          default: ArgumentConstraint; // default is force DataSourceInput
          // ? using cloud replace subitems
          using: string; // id for fetch data from prop
          subitems2?: ArgumentConstraint[];
      }
    | {
          type: 'vec';
          // ? creating
          constant: number;
          length: DataSource; // { type: 'nat32' }
          subitems: ArrayArgumentConstraintSubitem[]; // known constraint
          default: ArgumentConstraint; // default is force DataSourceInput
          // ? using cloud replace subitems
          using: string; // id for fetch data from prop
          subitems2?: ArgumentConstraint[];
      };

// opt constraint
// 1. constant is 0 means value always is []
// 2. constant is 1 means value constraint
// 3. constant is -1 means dynamic has
export type OptArgumentConstraint =
    | {
          type: 'opt';
          // ? creating
          constant: 0;
          has?: undefined;
          value?: undefined;
      }
    | {
          type: 'opt';
          // ? creating
          constant: 1;
          has?: undefined;
          value: ArgumentConstraint;
      }
    | {
          type: 'opt';
          // ? creating
          constant: -1;
          has: DataSource; // { type: 'bool' }
          value: ArgumentConstraint;
      };

// record constraint
export type RecordArgumentConstraint = {
    type: 'record';
    // ? creating
    subitems: ArgumentConstraint[]; // every subitem has constraint
};

// variant constraint
// 1. constant is not empty means only that subitem will be needed
// 2. constant is empty means dynamic select
export type VariantArgumentConstraint =
    | {
          type: 'variant';
          // ? creating
          constant: string; // constant
          value: ArgumentConstraint;
          select?: undefined; // all keys with null type
          subitems?: undefined; // every subitem has constraint or only constant's subitem
      }
    | {
          type: 'variant';
          // ? creating
          constant: ''; // dynamic
          value?: undefined;
          select: DataSource; // all keys with null type
          subitems: ArgumentConstraint[]; // every subitem has constraint or only constant's subitem
      };

// tuple constraint
export type TupleArgumentConstraint = {
    type: 'tuple';
    // ? creating
    subitems: ArgumentConstraint[]; // every subitem has constraint
};

// rec constraint
export type MainRecArgumentConstraint = {
    type: 'rec';
    // ? creating
    value: ArgumentConstraint;
};

// constant must can not be 0
export const findVecArgumentConstraintByIndex = (
    arg:
        | {
              type: BlobCandidType;
              constraint: BlobArgumentConstraint;
          }
        | {
              type: VecCandidType;
              constraint: VecArgumentConstraint;
          },
    i: number,
): ArgumentConstraint => {
    const constraint =
        arg.constraint.subitems2 && arg.constraint.subitems2[i]
            ? arg.constraint.subitems2[i]
            : arg.constraint.subitems &&
              arg.constraint.subitems[i] &&
              arg.constraint.subitems[i].type === 'custom' &&
              arg.constraint.subitems![i].constraint
            ? arg.constraint.subitems![i].constraint!
            : arg.constraint.default!;
    return constraint;
};
