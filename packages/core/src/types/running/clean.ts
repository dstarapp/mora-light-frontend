import { CandidType } from '../candid';
import { LightCore } from '../core';
import { ArgumentConstraint, DataSource, findVecArgumentConstraintByIndex } from '../source';
import { Transform } from '../transform';
import { DataTransmit } from '../transmit';
import { TriggerMode } from '../trigger';

export const cleanRuntimeByLightCore = (light: LightCore) => {
    light.data.forEach(cleanRuntimeByDataSource);
    cleanRuntimeByTriggerMode(light.trigger);
    cleanRuntimeByTransform(light.transform);
    light.transmits.forEach(cleanRuntimeByDataTransmit);
};

const cleanRuntimeByDataSource = (source: DataSource) => {
    delete source.runtime;

    switch (source.source) {
        case 'light':
            cleanRuntimeByCandidType(source.light.info.arg);
            cleanRuntimeByCandidType(source.light.info.result);

            if (!source.light.info.extra.constant) {
                delete source.light.info.extra.runtime;
            }

            cleanRuntimeByArgumentConstraint(source.light.arg);
            break;
        case 'combined':
            cleanRuntimeByCandidType(source.combined.from);

            cleanRuntimeByArgumentConstraint(source.combined.arg);
            break;
        case 'canister':
            cleanRuntimeByCandidType(source.canister.method.arg);
            cleanRuntimeByCandidType(source.canister.method.result);

            cleanRuntimeByArgumentConstraint(source.canister.arg);

            delete (source.canister.identity as any).runtime;
            break;
        case 'input':
            cleanRuntimeByCandidType(source.input.result);
            break;
        case 'constant':
            cleanRuntimeByCandidType(source.constant.result);
            break;
        case 'inner':
            cleanRuntimeByCandidType(source.inner.result);

            if (!source.inner.extra.constant && source.inner.extra.runtime !== undefined) {
                delete source.inner.extra.runtime;
            }
            break;
        case 'prop':
            cleanRuntimeByCandidType(source.prop.result);
            break;
        case 'outer':
            cleanRuntimeByCandidType(source.outer.result);

            if (source.outer.extra && !source.outer.extra.constant) {
                delete source.outer.extra.runtime;
            }
            break;
    }

    cleanRuntimeByTransform(source.transform);
};

const cleanRuntimeByCandidType = (type: CandidType) => {
    switch (type.type) {
        case 'blob':
        case 'vec':
        case 'opt':
            cleanRuntimeByCandidType(type.subtype);
            break;
        case 'record':
        case 'variant':
        case 'tuple':
            type.subitems.forEach((subitem) => cleanRuntimeByCandidType(subitem.type));
            break;
        case 'rec':
            if (type.subtype) cleanRuntimeByCandidType(type.subtype);
            break;
    }

    delete (type as any).runtime;
};

const cleanRuntimeByArgumentConstraint = (arg: ArgumentConstraint) => {
    cleanRuntimeByCandidType(arg.type);

    switch (arg.constraint.type) {
        case 'force':
            cleanRuntimeByDataSource(arg.constraint.source);
            break;
        case 'blob':
            if (arg.constraint.constant === 0) break;
            if (arg.constraint.constant > 0) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    cleanRuntimeByArgumentConstraint(constraint);
                }
            } else {
                cleanRuntimeByDataSource(arg.constraint.length!);
                const length = Math.max(
                    arg.constraint.subitems!.length,
                    arg.constraint.subitems2?.length ?? 0,
                );
                for (let i = 0; i < length; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    cleanRuntimeByArgumentConstraint(constraint);
                }
                cleanRuntimeByArgumentConstraint(arg.constraint.default!);
            }
            break;
        case 'vec':
            if (arg.constraint.constant === 0) break;
            if (arg.constraint.constant > 0) {
                for (let i = 0; i < arg.constraint.constant; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    cleanRuntimeByArgumentConstraint(constraint);
                }
            } else {
                cleanRuntimeByDataSource(arg.constraint.length!);
                const length = Math.max(
                    arg.constraint.subitems!.length,
                    arg.constraint.subitems2?.length ?? 0,
                );
                for (let i = 0; i < length; i++) {
                    const constraint = findVecArgumentConstraintByIndex(arg as any, i);
                    cleanRuntimeByArgumentConstraint(constraint);
                }
                cleanRuntimeByArgumentConstraint(arg.constraint.default!);
            }
            break;
        case 'opt':
            if (arg.constraint.constant === 0) break;
            if (arg.constraint.constant !== 1) {
                cleanRuntimeByDataSource(arg.constraint.has);
            }
            cleanRuntimeByArgumentConstraint(arg.constraint.value);
            break;
        case 'record':
            arg.constraint.subitems.forEach(cleanRuntimeByArgumentConstraint);
            break;
        case 'variant':
            if (arg.constraint.constant) {
                const key = arg.constraint.constant;
                if (arg.type.subitems!.find((subitem) => subitem.key === key)) {
                    cleanRuntimeByArgumentConstraint(arg.constraint.value!);
                    break;
                }
            }
            cleanRuntimeByDataSource(arg.constraint.select!);
            arg.constraint.subitems!.forEach(cleanRuntimeByArgumentConstraint);
            break;
        case 'tuple':
            arg.constraint.subitems.forEach(cleanRuntimeByArgumentConstraint);
            break;
        case 'rec':
            cleanRuntimeByArgumentConstraint(arg.constraint.value);
            break;
    }

    delete (arg as any).runtime;
};

const cleanRuntimeByTriggerMode = (trigger?: TriggerMode | undefined) => {
    if (trigger === undefined) return;

    delete (trigger as any).runtime;
};

const cleanRuntimeByTransform = (transform?: Transform | undefined) => {
    if (transform === undefined) return;

    cleanRuntimeByCandidType(transform.from);

    cleanRuntimeByCandidType(transform.to);

    if (transform.nested !== undefined) cleanRuntimeByTransform(transform.nested);
};
const cleanRuntimeByDataTransmit = (transmit: DataTransmit) => {
    switch (transmit.transmit) {
        case 'outer':
            cleanRuntimeByCandidType(transmit.type);

            cleanRuntimeByCandidType(transmit.from);
            cleanRuntimeByTransform(transmit.transform);
            break;
        case 'show':
            cleanRuntimeByCandidType(transmit.from);
            cleanRuntimeByTransform(transmit.transform);

            delete transmit.view.runtime;
            break;
    }
};
