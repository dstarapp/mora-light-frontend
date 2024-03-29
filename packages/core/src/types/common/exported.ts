export type ExportedOuter = {
    target: 'outer'; // export to other light
    tip: string; // information for tipping user
    // ? using
    using: string; // id for fetch data from prop
    name?: string; // ! must has name if user want to export this value
};

export type ExportedInner = {
    target: 'inner'; // export to inner data source
    tip?: undefined;
    // ? creating
    name: string; // ! must has name
};

// experted info
export type ExportedInfo = ExportedOuter | ExportedInner;
