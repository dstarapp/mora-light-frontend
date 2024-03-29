import { ArgumentConstraint, DataSource, findVecArgumentConstraintByIndex } from '../source';

export const hasUIByDataSource = (source: DataSource): boolean => {
    switch (source.source) {
        case 'light':
            return hasUIByArgumentConstraint(source.light.arg);
        case 'combined':
            return false;
        case 'canister':
            if (hasUIByArgumentConstraint(source.canister.arg)) return true;
            switch (source.canister.identity.from) {
                case 'anonymous':
                    return false;
                case 'host':
                    return true;
                case 'login':
                    return true;
                case 'host-login':
                    return true;
                case 'inner':
                    return true;
                case 'outer':
                    return true;
            }
        case 'input':
            return true;
        case 'constant':
            return false;
        case 'inner':
            return false;
        case 'prop':
            return false;
        case 'outer':
            return false;
    }
};

export const hasUIByArgumentConstraint = (arg: ArgumentConstraint): boolean => {
    switch (arg.constraint.type) {
        case 'force':
            return hasUIByDataSource(arg.constraint.source);
        case 'blob':
            if (arg.constraint.constant === 0) return false;
            if (arg.constraint.constant > 0) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    if (hasUIByArgumentConstraint(constraint)) return true;
                }
                return false;
            } else {
                if (hasUIByDataSource(arg.constraint.length!)) return true;
                const length = Math.max(
                    arg.constraint.subitems!.length,
                    arg.constraint.subitems2?.length ?? 0,
                );
                for (let i = 0; i < length; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    if (hasUIByArgumentConstraint(constraint)) return true;
                }
                if (hasUIByArgumentConstraint(arg.constraint.default!)) return true;
            }
            return false;
        case 'vec':
            if (arg.constraint.constant === 0) return false;
            if (arg.constraint.constant > 0) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    if (hasUIByArgumentConstraint(constraint)) return true;
                }
                return false;
            } else {
                if (hasUIByDataSource(arg.constraint.length!)) return true;
                const length = Math.max(
                    arg.constraint.subitems!.length,
                    arg.constraint.subitems2?.length ?? 0,
                );
                for (let i = 0; i < length; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    if (hasUIByArgumentConstraint(constraint)) return true;
                }
                if (hasUIByArgumentConstraint(arg.constraint.default!)) return true;
            }
            return false;
        case 'opt':
            if (arg.constraint.constant === 0) return false;
            if (arg.constraint.constant !== 1) {
                if (hasUIByDataSource(arg.constraint.has)) return true;
            }
            if (hasUIByArgumentConstraint(arg.constraint.value)) return true;
            return false;
        case 'record':
            for (let i = 0; i < arg.constraint.subitems.length; i++) {
                if (hasUIByArgumentConstraint(arg.constraint.subitems[i])) return true;
            }
            return false;
        case 'variant':
            if (arg.constraint.constant) {
                const key = arg.constraint.constant;
                if (arg.type.subitems!.find((subitem) => subitem.key === key)) {
                    return hasUIByArgumentConstraint(arg.constraint.value!);
                }
            }
            if (hasUIByDataSource(arg.constraint.select!)) return true;
            for (const subitem of arg.constraint.subitems!) {
                if (hasUIByArgumentConstraint(subitem)) return true;
            }
            return false;
        case 'tuple':
            for (let i = 0; i < arg.constraint.subitems.length; i++) {
                if (hasUIByArgumentConstraint(arg.constraint.subitems[i])) return true;
            }
            return false;
        case 'rec':
            if (hasUIByArgumentConstraint(arg.constraint.value)) return true;
            return false;
    }
};

export const hasUIByDataSourceWithUsingStatus = (source: DataSource): boolean => {
    switch (source.source) {
        case 'light':
            return hasUIByArgumentConstraintWithUsingStatus(source.light.arg);
        case 'combined':
            return source.exported?.target === 'outer';
        case 'canister':
            if (hasUIByArgumentConstraintWithUsingStatus(source.canister.arg)) return true;
            switch (source.canister.identity.from) {
                case 'anonymous':
                    return false;
                case 'host':
                    return true;
                case 'login':
                    return true;
                case 'host-login':
                    return true;
                case 'inner':
                    return true;
                case 'outer':
                    return true;
            }
        case 'input':
            return true;
        case 'constant':
            return source.exported?.target === 'outer';
        case 'inner':
            return source.exported?.target === 'outer';
        case 'prop':
            return source.exported?.target === 'outer';
        case 'outer':
            return true;
    }
};

export const hasUIByArgumentConstraintWithUsingStatus = (arg: ArgumentConstraint): boolean => {
    switch (arg.constraint.type) {
        case 'force':
            return hasUIByDataSourceWithUsingStatus(arg.constraint.source);
        case 'blob':
            if (arg.constraint.constant === 0) return false;
            if (arg.constraint.constant > 0) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    if (hasUIByArgumentConstraintWithUsingStatus(constraint)) return true;
                }
                return false;
            } else {
                if (hasUIByDataSourceWithUsingStatus(arg.constraint.length!)) return true;
                const length = Math.max(
                    arg.constraint.subitems!.length,
                    arg.constraint.subitems2?.length ?? 0,
                );
                for (let i = 0; i < length; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    if (hasUIByArgumentConstraintWithUsingStatus(constraint)) return true;
                }
                if (hasUIByArgumentConstraintWithUsingStatus(arg.constraint.default!)) return true;
            }
            return false;
        case 'vec':
            if (arg.constraint.constant === 0) return false;
            if (arg.constraint.constant > 0) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    if (hasUIByArgumentConstraintWithUsingStatus(constraint)) return true;
                }
                return false;
            } else {
                if (hasUIByDataSourceWithUsingStatus(arg.constraint.length!)) return true;
                const length = Math.max(
                    arg.constraint.subitems!.length,
                    arg.constraint.subitems2?.length ?? 0,
                );
                for (let i = 0; i < length; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    if (hasUIByArgumentConstraintWithUsingStatus(constraint)) return true;
                }
                if (hasUIByArgumentConstraintWithUsingStatus(arg.constraint.default!)) return true;
            }
            return false;
        case 'opt':
            if (arg.constraint.constant === 0) return false;
            if (arg.constraint.constant !== 1) {
                if (hasUIByDataSourceWithUsingStatus(arg.constraint.has)) return true;
            }
            if (hasUIByArgumentConstraintWithUsingStatus(arg.constraint.value)) return true;
            return false;
        case 'record':
            for (let i = 0; i < arg.constraint.subitems.length; i++) {
                if (hasUIByArgumentConstraintWithUsingStatus(arg.constraint.subitems[i]))
                    return true;
            }
            return false;
        case 'variant':
            if (arg.constraint.constant) {
                const key = arg.constraint.constant;
                if (arg.type.subitems!.find((subitem) => subitem.key === key)) {
                    return hasUIByArgumentConstraintWithUsingStatus(arg.constraint.value!);
                }
            }
            if (hasUIByDataSourceWithUsingStatus(arg.constraint.select!)) return true;
            for (const subitem of arg.constraint.subitems!) {
                if (hasUIByArgumentConstraintWithUsingStatus(subitem)) return true;
            }
            return false;
        case 'tuple':
            for (let i = 0; i < arg.constraint.subitems.length; i++) {
                if (hasUIByArgumentConstraintWithUsingStatus(arg.constraint.subitems[i]))
                    return true;
            }
            return false;
        case 'rec':
            if (hasUIByArgumentConstraintWithUsingStatus(arg.constraint.value)) return true;
            return false;
    }
};
