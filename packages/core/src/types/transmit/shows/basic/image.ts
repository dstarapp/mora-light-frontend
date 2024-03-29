import { BlobCandidType, TextCandidType } from '../../../candid';

export type ImageViewConstraint = {
    name: 'ImageView'; // image text view

    // ? creating
    ui?: ImageUI; // how to show ?
};

export type ImageUI = {
    customLabel?: string;

    customPreview?: boolean;
    customShape?: 'square' | 'round';

    width?: string;
};

export type ImageViewSupportedType =
    | TextCandidType
    | BlobCandidType
    | { type: 'vec'; subtype: { type: 'nat8' } };

export const getImageViewSupportedTypeList = (): ImageViewSupportedType[] => {
    return [
        { type: 'text' },
        { type: 'blob', subtype: { type: 'nat8' } },
        { type: 'vec', subtype: { type: 'nat8' } },
    ];
};
