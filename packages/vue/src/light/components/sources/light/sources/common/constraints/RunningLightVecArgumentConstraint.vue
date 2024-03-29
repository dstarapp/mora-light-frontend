<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../../../types/running/running';
import { RunningLight } from '../../../../../../../types/running/light';
import {
    CandidType,
    CandidValue,
    isSameCandidType,
    VecCandidType,
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
    VecArgumentConstraint,
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
    vecItems: ArrayArgumentConstraintSubitem[],
    wrappedItems: ArgumentConstraint[],
    defaultConstraint: ArgumentConstraint,
    find: (c: ArgumentConstraint, valueItems: ValueItem[]) => void,
): ValueItem[][] => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...values]; // Passing data start

    result[0] = [...last];

    const length = Math.max(wrappedConstant, vecItems.length);
    if (length > 0) {
        for (let i = 1; i < length; i++) {
            const c = wrappedItems[i - 1] ?? vecItems[i].constraint ?? defaultConstraint; // Get the previous data source

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
    vecItems: ArrayArgumentConstraintSubitem[],
    wrappedItems: ArgumentConstraint[],
    defaultConstraint: ArgumentConstraint,
    find: (c: ArgumentConstraint, valueItems: ValueItem[], innerValues: ValueItem[]) => void,
): ValueItem[][] => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...values]; // Passing data start

    result[0] = [...last];

    const length = Math.max(wrappedConstant, vecItems.length);
    if (length > 0) {
        for (let i = 1; i < length; i++) {
            const c = wrappedItems[i - 1] ?? vecItems[i].constraint ?? defaultConstraint; // Get the previous data source

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
        type: Object as PropType<StringResult<CandidValue[]>>,
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
        type: Object as PropType<VecCandidType>,
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
        type: Object as PropType<VecArgumentConstraint>,
        required: true,
    },
});

let checkedType: CandidType = props.type;
let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.innerValues];
let checkedOuterValues: ValueItem[] = [...props.outerValues];

// The correct data is passed down down
const vecConstant = ref<number>(props.initial.constant);
const vecLength = ref<DataSource>(props.initial.length);
const vecItems = ref<ArrayArgumentConstraintSubitem[]>(props.initial.items);

const wrappedItems = ref<ArgumentConstraint[]>(props.initial.items2 ?? []);
const vecItemsRuntime = ref<(CandidValue | undefined)[]>([]);

// Receive data that is passed upward
let { lengthResult: vecLengthResult, itemsResults: vecItemsResults } = parseDataResult(
    vecConstant.value,
    vecLength.value,
    vecItems.value,
    props.canExportValues,
    [...props.innerValues],
    [...props.outerValues],
    undefined,
    [],
);

const wrappedConstant = computed(() => {
    if (vecConstant.value >= 0) return vecConstant.value;
    if (vecLength.value.type.runtime?.ok !== undefined) {
        const value = vecLength.value.type.runtime.ok as number;
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
    while (vecItemsRuntime.value.length > length) vecItemsRuntime.value.splice(items.length - 1, 1);

    for (let i = 0; i < length; i++) {
        if (items[i] !== undefined) continue;
        const item = vecItems.value[i];
        const constraint = item?.constraint ?? deepClone(props.ui?.default);
        const runtime = vecItemsRuntime.value[i];
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
    () => [wrappedConstant.value, vecItems.value, props.ui?.default],
    (nv, ov) => {
        if (same(nv, ov)) return;
        checkWrappedItems();
    },
);

// Each ArgumentConstraint on this page may add Inner Values
const innerValues = computed<ValueItem[][]>(() =>
    calcInnerValues(
        ((innerValues: ValueItem[], vecLength: DataSource) => {
            const items = [...innerValues];
            findInnerValueItemsByDataSource(vecLength, items);
            return items;
        })(props.innerValues, vecLength.value),
        wrappedConstant.value,
        vecItems.value,
        wrappedItems.value,
        props.ui?.default,
        findInnerValueItemsByArgumentConstraint,
    ),
);
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[][]>(() =>
    calcOuterValues(
        innerValues.value,
        ((outerValues: ValueItem[], vecLength: DataSource, innerValues: ValueItem[]) => {
            const items = [...outerValues];
            findOuterValueItemsByDataSource(vecLength, items, [...innerValues]);
            return items;
        })(props.outerValues, vecLength.value, innerValues.value[0]),
        wrappedConstant.value,
        vecItems.value,
        wrappedItems.value,
        props.ui?.default,
        findOuterValueItemsByArgumentConstraint,
    ),
);

watch(
    () => props.argResult,
    () => changed(),
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

    const newVecConstant = props.initial.constant;
    const newVecLength = props.initial.length;
    const newVecItems = props.initial.items;

    const { lengthResult: newVecLengthResult, itemsResults: newVecItemsResults } = parseDataResult(
        newVecConstant,
        newVecLength,
        newVecItems,
        newCheckedCanExportValues,
        [...newCheckedInnerValues],
        [...newCheckedOuterValues],
        undefined,
        [],
    );
    let newVecItemsRuntime = vecItemsRuntime.value;
    if (!isSameCandidType(checkedType, newCheckedType)) newVecItemsRuntime = [];

    if (
        initialed &&
        same(checkedType, newCheckedType) &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(vecConstant.value, newVecConstant) &&
        same(vecLength.value, newVecLength) &&
        same(vecItems.value, newVecItems) &&
        same(vecLengthResult, newVecLengthResult) &&
        same(vecItemsResults, newVecItemsResults) &&
        same(vecItemsRuntime.value, newVecItemsRuntime)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedType = newCheckedType;
    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    vecConstant.value = newVecConstant;
    vecLength.value = newVecLength;
    vecItems.value = newVecItems;

    vecLengthResult = newVecLengthResult;
    vecItemsResults = newVecItemsResults;

    vecItemsRuntime.value = newVecItemsRuntime;

    initialed = true;

    changed();
};

const produce = (): DataResult<VecArgumentConstraint> => {
    if (!initialed)
        return {
            err: { message: `${props.status} light vec argument constraint has not been initial.` },
        };

    if (vecLengthResult.err !== undefined) return { err: vecLengthResult.err };

    const ok: VecArgumentConstraint = props.initial;

    ok.length = vecLengthResult.ok;

    delete ok.runtime;
    delete ok.items2;

    if (props.argResult?.ok !== undefined) {
        ok.runtime = props.argResult;
        return { ok };
    }

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<VecArgumentConstraint>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-light-vec-argument-constraint-content"></div>
</template>

<style lang="less" scoped>
.running-light-vec-argument-constraint-content {
    width: 100%;
}
</style>
