import { CandidValue, TupleCandidType, findChildTypeAndValue } from '../candid';
import { StringResult } from '../common';
import { Transform, doTransform } from '../transform';
import { UnionTransmitShowView } from './shows';

export * from './shows';

// transmits 2 - show data for user
export type DataTransmitShowView = {
    transmit: 'show';

    from: TupleCandidType; // data source result
    child?: number; // abstract child value if result is alone type

    // ? creating
    transform?: Transform; // maybe needs transform

    view: UnionTransmitShowView;
};

export const doTransmitShow = async (
    transmit: DataTransmitShowView,
    runtime: StringResult<CandidValue>,
    running: boolean,
) => {
    // 0. return err if there is error message
    if (runtime.err !== undefined) {
        transmit.view.runtime = runtime;
        return;
    }

    // console.error("check candid value 0", JSON.stringify(transmit), JSON.stringify(runtime.ok));

    // 1. fetch child type
    let { value } = findChildTypeAndValue(runtime.ok, transmit.from, transmit.child);

    // console.error("check candid value 1", JSON.stringify(runtime), JSON.stringify(value));

    // 2. do transform
    const transformResult = await doTransform(transmit.transform, value, running);
    if (transformResult.err !== undefined) {
        transmit.view.runtime = transformResult;
        return;
    }
    value = transformResult.ok;

    // console.error(
    //     "check candid value 2",
    //     transmit.constraint.need,
    //     JSON.stringify(value),
    //     JSON.stringify(runtime),
    //     checkCandidValue(transmit.constraint.need, value),
    // );

    // 3. check value and type
    // if (!checkCandidValue(transmit.constraint.need, value, [])) {
    //     transmit.constraint.runtime = {
    //         err: `wrong value ${JSON.stringify(value)} for type '${unwrapCandidType(
    //             transmit.constraint.need,
    //         )}'`,
    //     };
    //     return;
    // }

    // console.error("check candid value set", value);

    transmit.view.runtime = { ok: value as any };
};
