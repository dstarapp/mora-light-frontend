export type ClockRuntime = {
    last: number; // last executed time
};

export type ClockTrigger = {
    type: 'clock'; // clock trigger
    sleep: number; // interval ms
    loading: boolean; // page loading executed or not
};
