<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../../../types/running/running';
import { RunningLight } from '../../../../../../../types/running/light';
import {
    CandidType,
    isSameCandidType,
    BlobCandidType,
} from '../../../@mora-light/core/types/candid';
import {
    ValueItem,
    findInnerValueItemsByDataSource,
    findOuterValueItemsByDataSource,
    findInnerValueItemsByArgumentConstraint,
    findOuterValueItemsByArgumentConstraint,
} from '../../../../../../../types/common/value';
import {
    ArgumentConstraint,
    ArrayArgumentConstraintSubitem,
    BlobArgumentConstraint,
} from '../../../../../../../types/parts/sources/arg';
import { checkDataSource, checkArgumentConstraint } from '../../../../../../../types/common/check';
import { deepClone, DataResult, same, StringResult } from '../../../../../../../common';
import { DataSource } from '../../../../../../../types/parts/sources/sources';

const parseDataResult = (
    constant: number,
    length: DataSource,
    constraintItems: ArrayArgumentConstraintSubitem[],
    canExportValues: boolean,
    innerValues: ValueItem[],
    outerValues: ValueItem[],
    lengthEl: HTMLElement | undefined,
    itemsEls: HTMLElement[],
): {
    lengthResult: DataResult<DataSource>;
    itemsResults: DataResult<ArrayArgumentConstraintSubitem>[];
} => {
    innerValues = [...innerValues];
    outerValues = [...outerValues];

    const lengthResult = checkDataSource(
        length,
        canExportValues,
        innerValues,
        outerValues,
        lengthEl,
    );

    innerValues = lengthResult.innerValues;
    outerValues = lengthResult.outerValues!;

    const itemsResults: DataResult<ArrayArgumentConstraintSubitem>[] = [];
    for (let i = 0; i < items.length; i++) {
        const constraint = items[i]?.constraint;
        if (constraint !== undefined) {
            const r = checkArgumentConstraint(
                constraint,
                canExportValues && constant > 0,
                innerValues,
                outerValues,
                itemsEls[i],
            );
            itemsResults[i] = !r.result.err ? { ok: items[i] } : { err: r.result.err };
            innerValues = r.innerValues;
            outerValues = r.outerValues!;
        } else {
            itemsResults[i] = { ok: items[i] };
        }
    }

    return {
        lengthResult: lengthResult.result,
        itemsResults: itemsResults,
    };
};

const calcInnerValues = (
    values: ValueItem[],
    wrappedConstant: number,
    blobItems: ArrayArgumentConstraintSubitem[],
    wrappedItems: ArgumentConstraint[],
    defaultConstraint: ArgumentConstraint,
    find: (c: ArgumentConstraint, valueItems: ValueItem[]) => void,
): ValueItem[][] => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...values]; // Passing data start

    result[0] = [...last];

    const length = Math.max(wrappedConstant, blobItems.length);
    if (length > 0) {
        for (let i = 1; i < length; i++) {
            const c = wrappedItems[i - 1] ?? blobItems[i].constraint ?? defaultConstraint; // Get the previous data source

            let valueItems: ValueItem[] = [...last];

            find(c, valueItems);

            last = valueItems;

            result[i] = [...last];
        }
    }

    return result;
};
const calcOuterValues = (
    innerValues: ValueItem[][],
    values: ValueItem[],
    wrappedConstant: number,
    blobItems: ArrayArgumentConstraintSubitem[],
    wrappedItems: ArgumentConstraint[],
    defaultConstraint: ArgumentConstraint,
    find: (c: ArgumentConstraint, valueItems: ValueItem[], innerValues: ValueItem[]) => void,
): ValueItem[][] => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...values]; // Passing data start

    result[0] = [...last];

    const length = Math.max(wrappedConstant, blobItems.length);
    if (length > 0) {
        for (let i = 1; i < length; i++) {
            const c = wrappedItems[i - 1] ?? blobItems[i].constraint ?? defaultConstraint; // Get the previous data source

            let valueItems: ValueItem[] = [...last];

            find(c, valueItems, [...innerValues[i]]);

            last = valueItems;

            result[i] = [...last];
        }
    }

    return result;
};

const props = defineProps({
    layer: {
        type: Number,
        required: true, // The top layer is displayed wrong, so it is necessary to record the level
    },
    argResult: {
        type: Object as PropType<StringResult<number[]>>,
        required: false,
    },
    triggerRefresh: {
        type: Number,
        required: true,
    },
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    index: {
        type: Number,
        required: false, // Display serial number
    },
    runningLight: {
        type: Object as PropType<RunningLight>,
        required: true,
    },
    parentSourceId: {
        type: Number,
        required: true,
    },
    calling: {
        type: Number,
        required: true,
    },
    type: {
        type: Object as PropType<BlobCandidType>,
        required: true,
    },
    canExportValues: {
        type: Boolean,
        required: true, // There is a state that has an export internal variable option, because the state that can only be determined during use or runtime is not exported
    },
    innerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true,
    },
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true,
    },
    hasLabel: {
        type: Boolean,
        required: true,
    },
    initial: {
        type: Object as PropType<BlobArgumentConstraint>,
        required: true,
    },
});

let checkedType: CandidType = props.type;
let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.innerValues];
let checkedOuterValues: ValueItem[] = [...props.outerValues];

// The correct data is passed down down
const blobConstant = ref<number>(props.initial.constant);
const blobLength = ref<DataSource>(props.initial.length);
const blobItems = ref<ArrayArgumentConstraintSubitem[]>(props.initial.items);

const wrappedItems = ref<ArgumentConstraint[]>(props.initial.items2 ?? []);
const blobItemsRuntime = ref<(number | undefined)[]>([]);

// Receive data that is passed upward
let { lengthResult: blobLengthResult, itemsResults: blobItemsResults } = parseDataResult(
    blobConstant.value,
    blobLength.value,
    blobItems.value,
    props.canExportValues,
    [...props.innerValues],
    [...props.outerValues],
    undefined,
    [],
);

const wrappedConstant = computed(() => {
    if (blobConstant.value >= 0) return blobConstant.value;
    if (blobLength.value.type.runtime?.ok !== undefined) {
        const value = blobLength.value.type.runtime.ok as number;
        return value >= 0 ? value : -1;
    }
    return -1;
});

const checkWrappedItems = () => {
    const length = wrappedConstant.value;
    if (length <= 0) {
        wrappedItems.value = [];
        return;
    }

    const items = wrappedItems.value;

    while (items.length > length) items.splice(items.length - 1, 1);
    while (blobItemsRuntime.value.length > length)
        blobItemsRuntime.value.splice(items.length - 1, 1);

    for (let i = 0; i < length; i++) {
        if (items[i] !== undefined) continue;
        const item = blobItems.value[i];
        const constraint = item?.constraint ?? deepClone(props.ui?.default);
        const runtime = blobItemsRuntime.value[i];
        if (runtime !== undefined) {
            constraint.runtime = { ok: runtime };
        } else {
            delete constraint.runtime;
        }
        items[i] = constraint;
    }

    wrappedItems.value = items;
};
checkWrappedItems();
watch(
    () => [wrappedConstant.value, blobItems.value, props.ui?.default],
    (nv, ov) => {
        if (same(nv, ov)) return;
        checkWrappedItems();
    },
);

// Each ArgumentConstraint on this page may add Inner Values
const innerValues = computed<ValueItem[][]>(() =>
    calcInnerValues(
        ((innerValues: ValueItem[], blobLength: DataSource) => {
            const items = [...innerValues];
            findInnerValueItemsByDataSource(blobLength, items);
            return items;
        })(props.innerValues, blobLength.value),
        wrappedConstant.value,
        blobItems.value,
        wrappedItems.value,
        props.ui?.default,
        findInnerValueItemsByArgumentConstraint,
    ),
);
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[][]>(() =>
    calcOuterValues(
        innerValues.value,
        ((outerValues: ValueItem[], blobLength: DataSource, innerValues: ValueItem[]) => {
            const items = [...outerValues];
            findOuterValueItemsByDataSource(blobLength, items, [...innerValues]);
            return items;
        })(props.outerValues, blobLength.value, innerValues.value[0]),
        wrappedConstant.value,
        blobItems.value,
        wrappedItems.value,
        props.ui?.default,
        findOuterValueItemsByArgumentConstraint,
    ),
);

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.type, props.canExportValues, props.innerValues, props.outerValues, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedType: CandidType = props.type;
    const newCheckedCanExportValues = props.canExportValues;
    const newCheckedInnerValues: ValueItem[] = [...props.innerValues];
    const newCheckedOuterValues: ValueItem[] = [...props.outerValues];

    const newBlobConstant = props.initial.constant;
    const newBlobLength = props.initial.length;
    const newBlobItems = props.initial.items;

    const { lengthResult: newBlobLengthResult, itemsResults: newBlobItemsResults } =
        parseDataResult(
            newBlobConstant,
            newBlobLength,
            newBlobItems,
            newCheckedCanExportValues,
            [...newCheckedInnerValues],
            [...newCheckedOuterValues],
            undefined,
            [],
        );
    let newBlobItemsRuntime = blobItemsRuntime.value;
    if (!isSameCandidType(checkedType, newCheckedType)) newBlobItemsRuntime = [];

    if (
        initialed &&
        same(checkedType, newCheckedType) &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(blobConstant.value, newBlobConstant) &&
        same(blobLength.value, newBlobLength) &&
        same(blobItems.value, newBlobItems) &&
        same(blobLengthResult, newBlobLengthResult) &&
        same(blobItemsResults, newBlobItemsResults) &&
        same(blobItemsRuntime.value, newBlobItemsRuntime)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedType = newCheckedType;
    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    blobConstant.value = newBlobConstant;
    blobLength.value = newBlobLength;
    blobItems.value = newBlobItems;

    blobLengthResult = newBlobLengthResult;
    blobItemsResults = newBlobItemsResults;

    blobItemsRuntime.value = newBlobItemsRuntime;

    initialed = true;

    changed();
};

const produce = (): DataResult<BlobArgumentConstraint> => {
    if (!initialed)
        return {
            err: {
                message: `${props.status} light blob argument constraint has not been initial.`,
            },
        };

    if (blobLengthResult.err !== undefined) return { err: blobLengthResult.err };

    const ok: BlobArgumentConstraint = props.initial;

    ok.length = blobLengthResult.ok;

    delete ok.runtime;
    delete ok.items2;

    if (props.argResult?.ok !== undefined) {
        ok.runtime = props.argResult;
        return { ok };
    }

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<BlobArgumentConstraint>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-light-blob-argument-constraint-content"></div>
</template>

<style lang="less" scoped>
.running-light-blob-argument-constraint-content {
    width: 100%;
}
</style>
