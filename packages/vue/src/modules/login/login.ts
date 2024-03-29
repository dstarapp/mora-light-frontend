// plug update
let nextPlugSubscribeId = 0;

const record: Record<number, () => void> = {};

export const onPlugConnectionUpdate = () => {
    for (let id of Object.keys(record)) record[id]();
};

export const subscribePlugConnectionUpdate = (action: () => void): number => {
    const nextId = ++nextPlugSubscribeId;
    record[nextId] = action;
    return nextId;
};

export const unsubscribePlugConnectionUpdate = (id: number) => delete record[id];

// derivation origin

let derivationOrigin: string | undefined = undefined;

export const setDerivationOrigin = (origin: string | undefined) => (derivationOrigin = origin);

export const getDerivationOrigin = () => derivationOrigin;
