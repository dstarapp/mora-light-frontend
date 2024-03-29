export type ButtonRuntime = {
    last: number; // last executed time
};

export type ButtonTrigger = {
    type: 'button'; // button trigger
    text: string; // showed text
    loading: boolean; // page loading executed or not
};
