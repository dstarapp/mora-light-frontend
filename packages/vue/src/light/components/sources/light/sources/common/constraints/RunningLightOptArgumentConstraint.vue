<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../../../types/running/running';
import { RunningLight } from '../../../../../../../types/running/light';
import { CandidType, CandidValue, OptCandidType } from '../../../@mora-light/core/types/candid';
import {
    ValueItem,
    findInnerValueItemsByDataSource,
    findOuterValueItemsByDataSource,
} from '../../../../../../../types/common/value';
import {
    ArgumentConstraint,
    OptArgumentConstraint,
} from '../../../../../../../types/parts/sources/arg';
import { checkDataSource, checkArgumentConstraint } from '../../../../../../../types/common/check';
import { DataResult, same, StringResult } from '../../../../../../../common';
import { DataSource } from '../../../../../../../types/parts/sources/sources';

const parseDataResult = (
    constant: -1 | 0 | 1,
    has: DataSource,
    value: ArgumentConstraint,
    canExportValues: boolean,
    innerValues: ValueItem[],
    outerValues: ValueItem[],
    hasEl: HTMLElement | undefined,
    valueEl: HTMLElement | undefined,
): {
    hasResult: DataResult<DataSource>;
    valueResult: DataResult<ArgumentConstraint>;
} => {
    innerValues = [...innerValues];
    outerValues = [...outerValues];

    const hasResult = checkDataSource(has, canExportValues, innerValues, outerValues, hasEl);

    innerValues = hasResult.innerValues;
    outerValues = hasResult.outerValues!;

    const valueResult = checkArgumentConstraint(
        value,
        canExportValues && constant === 1,
        innerValues,
        outerValues,
        valueEl,
    ).result;

    return {
        hasResult: hasResult.result,
        valueResult,
    };
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
        type: Object as PropType<OptCandidType>,
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
        type: Object as PropType<OptArgumentConstraint>,
        required: true,
    },
});

let checkedType: CandidType = props.type;
let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.innerValues];
let checkedOuterValues: ValueItem[] = [...props.outerValues];

// The correct data is passed down down
const optConstant = ref<-1 | 0 | 1>(props.initial.constant);
const optHas = ref<DataSource>(props.initial.has);
const optValue = ref<ArgumentConstraint>(props.initial.value);

// Receive data that is passed upward
let { hasResult: optHasResult, valueResult: optValueResult } = parseDataResult(
    optConstant.value,
    optHas.value,
    optValue.value,
    props.canExportValues,
    [...props.innerValues],
    [...props.outerValues],
    undefined,
    undefined,
);

const wrappedConstant = computed(() => {
    if (optConstant.value >= 0) return optConstant.value;
    if (optHas.value.type.runtime?.ok !== undefined) {
        const value = optHas.value.type.runtime.ok as [] | [null];
        return value.length;
    }
    return -1;
});

// Each ArgumentConstraint on this page may add Inner Values
const innerValues = computed<ValueItem[]>(() => {
    let last: ValueItem[] = [...props.innerValues]; // Passing data start

    findInnerValueItemsByDataSource(optHas.value, last);

    // console.error("innerValues opt argument constraint", result);

    return last;
});
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[]>(() => {
    let last: ValueItem[] = [...props.outerValues]; // Passing data start

    findOuterValueItemsByDataSource(optHas.value, last, [...innerValues.value]);

    // console.error("outerValues opt argument constraint", result);

    return last;
});

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

    const newOptConstant = props.initial.constant;
    const newOptHas = props.initial.has;
    const newOptValue = props.initial.value;

    const { hasResult: newOptHasResult, valueResult: newOptValueResult } = parseDataResult(
        newOptConstant,
        newOptHas,
        newOptValue,
        newCheckedCanExportValues,
        [...newCheckedInnerValues],
        [...newCheckedOuterValues],
        undefined,
        undefined,
    );

    if (
        initialed &&
        same(checkedType, newCheckedType) &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(optConstant.value, newOptConstant) &&
        same(optHas.value, newOptHas) &&
        same(optValue.value, newOptValue) &&
        same(optHasResult, newOptHasResult) &&
        same(optValueResult, newOptValueResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedType = newCheckedType;
    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    optConstant.value = newOptConstant;
    optHas.value = newOptHas;
    optValue.value = newOptValue;

    optHasResult = newOptHasResult;
    optValueResult = newOptValueResult;

    initialed = true;

    changed();
};

const produce = (): DataResult<OptArgumentConstraint> => {
    if (!initialed)
        return {
            err: { message: `${props.status} light opt argument constraint has not been initial.` },
        };

    if (optHasResult.err !== undefined) return { err: optHasResult.err };

    const ok: OptArgumentConstraint = props.initial;

    ok.has = optHasResult.ok;

    delete ok.runtime;

    if (props.argResult?.ok !== undefined) {
        ok.runtime = props.argResult;
        return { ok };
    }

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<OptArgumentConstraint>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-light-opt-argument-constraint-content"></div>
</template>

<style lang="less" scoped>
.running-light-opt-argument-constraint-content {
    width: 100%;
}
</style>
