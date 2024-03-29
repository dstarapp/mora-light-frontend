export const checkAndExecute = (
    condition: boolean | (() => boolean),
    callback: () => void,
    changed: () => void,
    ms?: number,
): void => {
    if (typeof condition === 'function') condition = condition();
    if (condition) callback();
    else setTimeout(changed, ms ?? 233);
};

export const checkAndAssignValue = <T>(
    object: object,
    field: string,
    value: T | undefined,
    condition?: boolean,
) => {
    if ((condition === undefined || condition) && value !== undefined) {
        (object as any)[field] = value;
    } else {
        delete (object as any)[field];
    }
};
