export type OkResult<T> = {
    ok: T; // has something
    err?: undefined;
};

export type ErrResult<E> = {
    ok?: undefined;
    err: E; // error message
};

// common result
type Result<T, E> = OkResult<T> | ErrResult<E>;

// error message is string
export type StringResult<T> = Result<T, string>;

// error message has extra html element
export type DataResult<T> = Result<
    T,
    {
        message: string; // error message
        el?: HTMLElement; // wrong html element
    }
>;

export const parseDataResultArrayWithTransform = <T, R>(
    data: T[],
    transform: (t: T) => R,
    check?: (t: T, index: number) => [true] | [false, { message: string; el?: HTMLElement }],
): DataResult<R>[] => {
    if (!check) check = () => [true];

    const r: DataResult<R>[] = [];

    for (let i = 0; i < data.length; i++) {
        const [passed, err] = check(data[i], i);
        r[i] = passed ? { ok: transform(data[i]) } : { err };
    }

    return r;
};

export const parseDataResultArray = <T>(
    data: T[],
    check?: (t: T, index: number) => [true] | [false, { message: string; el?: HTMLElement }],
): DataResult<T>[] => parseDataResultArrayWithTransform(data, (t) => t, check);
