export type TableViewSupportedType = TableViewSupportedType1;

export type TableViewConstraint = {
    name: 'TableView'; // bool view

    // ? creating
    ui?: TableUI; // how to show ?
};

export type TableUI = {
    customLabel?: string;

    customBorder?: boolean;
    customFixedHeader?: boolean;
};

export type TableViewSupportedType1 = {
    type: 'record';
    subitems: [
        {
            key: 'header';
            type: {
                type: 'vec';
                subtype: { type: 'text' };
            };
        },
        {
            key: 'rows';
            type: {
                type: 'vec';
                subtype: {
                    type: 'vec';
                    subtype: { type: 'text' };
                };
            };
        },
    ];
};

export const getTableViewSupportedTypeList = (): TableViewSupportedType[] => {
    return [
        {
            type: 'record',
            subitems: [
                {
                    key: 'header',
                    type: {
                        type: 'vec',
                        subtype: { type: 'text' },
                    },
                },
                {
                    key: 'rows',
                    type: {
                        type: 'vec',
                        subtype: {
                            type: 'vec',
                            subtype: { type: 'text' },
                        },
                    },
                },
            ],
        },
    ];
};
