<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import {
    CheckedResult,
    ComponentStatus,
    RunningLight,
    ValueItem,
    checkArgumentConstraint,
    checkDataSource,
    findInnerValueItemsByDataSource,
    findOuterValueItemsByDataSource,
    hasUIByDataSource,
} from '@mora-light/core/types/running';
import {
    ArgumentConstraint,
    OptArgumentConstraint,
    DataSource,
    findDataSourceType,
} from '@mora-light/core/types/source';
import {
    assignRuntime,
    checkAndExecute,
    DataResult,
    deleteRuntime,
    readRuntime,
    same,
} from '@mora-light/core/types/common';
import { OptCandidType, CandidType, RecItem } from '@mora-light/core/types/candid';
import RunningWrappedSourceVue from '../../RunningWrappedSource.vue';
import RunningArgumentConstraintVue from '../RunningArgumentConstraint.vue';

const parseDataResult = (
    constant: -1 | 0 | 1,
    has: DataSource | undefined,
    value: ArgumentConstraint | undefined,
    canExportValues: boolean,
    values: { outerValues: ValueItem[]; propValues: ValueItem[]; innerValues: ValueItem[] },
    hasEl: HTMLElement | undefined,
    valueEl: HTMLElement | undefined,
): {
    hasResult: DataResult<DataSource> | undefined;
    valueResult: DataResult<ArgumentConstraint> | undefined;
} => {
    let outerValues = [...values.outerValues];
    let propValues = [...values.propValues];
    let innerValues = [...values.innerValues];

    let hasResult: CheckedResult<DataSource> | undefined = undefined;
    if (has) {
        hasResult = checkDataSource(
            has,
            canExportValues,
            { outerValues, propValues, innerValues },
            hasEl,
        );

        outerValues = hasResult.values.outerValues!;
        innerValues = hasResult.values.innerValues;
    }

    let valueResult: DataResult<ArgumentConstraint> | undefined = undefined;
    if (value) {
        valueResult = checkArgumentConstraint(
            value,
            canExportValues && constant === 1,
            { outerValues, propValues, innerValues },
            valueEl,
        ).result;
    }

    return {
        hasResult: hasResult?.result,
        valueResult,
    };
};

const props = defineProps({
    layer: {
        type: Number,
        required: true, // The top layer is displayed wrong, so it is necessary to record the level
    },
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    parentSourceId: {
        type: Number,
        required: true,
    },
    runningLight: {
        type: Object as PropType<RunningLight>,
        required: true,
    },
    values: {
        type: Object as PropType<{
            outerValues: ValueItem[];
            propValues: ValueItem[];
            innerValues: ValueItem[];
        }>,
        required: true,
    },
    calling: {
        type: Number,
        required: true,
    },
    recItems: {
        type: Array as PropType<RecItem[]>,
        required: true, // The type that once appeared
    },
    type: {
        type: Object as PropType<OptCandidType>,
        required: true,
    },
    canExportValues: {
        type: Boolean,
        required: true, // There is a state that has an export internal variable option, because the state that can only be determined during use or runtime is not exported
    },
    index: {
        type: Number,
        required: false, // Display serial number
    },
    initial: {
        type: Object as PropType<OptArgumentConstraint>,
        required: true,
    },
    hasLabel: {
        type: Boolean,
        required: true,
    },
    triggerRefresh: {
        type: Number,
        required: true,
    },
});

const hasRef = ref<HTMLElement>();
const valueRef = ref<HTMLElement>();

let checkedType: CandidType = props.type;
let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.values.innerValues];
let checkedOuterValues: ValueItem[] = [...props.values.outerValues];

// The correct data is passed down down
const optConstant = ref<-1 | 0 | 1>(props.initial.constant);
const optHas = ref<DataSource | undefined>(props.initial.has);
const optValue = ref<ArgumentConstraint | undefined>(props.initial.value);

// Receive data that is passed upward
let { hasResult: optHasResult, valueResult: optValueResult } = parseDataResult(
    optConstant.value,
    optHas.value,
    optValue.value,
    props.canExportValues,
    {
        outerValues: [...props.values.outerValues],
        propValues: props.values.propValues,
        innerValues: [...props.values.innerValues],
    },
    hasRef.value,
    valueRef.value,
);

const wrappedConstant = computed(() => {
    if (optConstant.value >= 0) return optConstant.value;
    const runtime = readRuntime<[] | [null]>(
        optHas.value ? findDataSourceType(optHas.value) : undefined,
    );
    if (runtime?.ok !== undefined) {
        const value = runtime.ok as [] | [null];
        return value.length;
    }
    return -1;
});

// Each ArgumentConstraint on this page may add Inner Values
const innerValues = computed<ValueItem[]>(() => {
    let last: ValueItem[] = [...props.values.innerValues]; // Passing data start

    if (optHas.value) {
        findInnerValueItemsByDataSource(
            optHas.value,
            {
                propValues: props.values.propValues,
            },
            last,
        );
    }

    // console.error("innerValues opt argument constraint", result);

    return last;
});
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[]>(() => {
    let last: ValueItem[] = [...props.values.outerValues]; // Passing data start

    if (optHas.value) {
        findOuterValueItemsByDataSource(
            optHas.value,
            { propValues: props.values.propValues, innerValues: [...innerValues.value] },
            last,
        );
    }

    // console.error("outerValues opt argument constraint", result);

    return last;
});

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.type, props.canExportValues, props.values, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedType: CandidType = props.type;
    const newCheckedCanExportValues = props.canExportValues;
    const newCheckedInnerValues: ValueItem[] = [...props.values.innerValues];
    const newCheckedOuterValues: ValueItem[] = [...props.values.outerValues];

    const newOptConstant = props.initial.constant;
    const newOptHas = props.initial.has;
    const newOptValue = props.initial.value;

    const { hasResult: newOptHasResult, valueResult: newOptValueResult } = parseDataResult(
        newOptConstant,
        newOptHas,
        newOptValue,
        newCheckedCanExportValues,
        {
            outerValues: [...newCheckedOuterValues],
            propValues: props.values.propValues,
            innerValues: [...newCheckedInnerValues],
        },
        hasRef.value,
        valueRef.value,
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

const onOptHasChanged = (r: DataResult<DataSource>) => {
    optHasResult = r;

    if (r.ok !== undefined) optHas.value = r.ok;

    changed();
};

const onOptValueChanged = (r: DataResult<ArgumentConstraint>) => {
    optValueResult = r;

    if (r.ok !== undefined) optValue.value = r.ok;

    changed();
};

const produce = (): DataResult<OptArgumentConstraint> => {
    if (!initialed)
        return {
            err: { message: `${props.status} opt argument constraint has not been initial.` },
        };

    if (optHasResult?.err !== undefined) return { err: optHasResult.err };

    const ok: OptArgumentConstraint = props.initial;

    if (optHasResult?.ok) ok.has = optHasResult.ok;
    else delete ok.has;

    deleteRuntime(ok);

    if (wrappedConstant.value === 0) {
        assignRuntime(ok, { ok: [] });
        return { ok };
    }

    if (optValueResult) {
        if (optValueResult.err !== undefined) return { err: optValueResult.err };
        ok.value = optValueResult.ok;
    }

    if (wrappedConstant.value === 1) {
        const runtimeResult = readRuntime(ok.value);
        if (runtimeResult?.ok !== undefined) assignRuntime(ok, { ok: [runtimeResult.ok] });
        return { ok };
    }

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<OptArgumentConstraint>];
}>();

const changed = () =>
    checkAndExecute(
        props.status !== 'using' ||
            (!!hasRef.value && (wrappedConstant.value !== 1 || !!valueRef.value)),
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-opt-argument-constraint-content">
        <template v-if="optHas">
            <RunningWrappedSourceVue
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="optHas"
                :triggerRefresh="props.triggerRefresh"
                @changed="onOptHasChanged"
                ref="hasRef"
                :opt-has="optHas.source"
            />
        </template>

        <div class="tip" v-if="props.status === 'using' && optHas && hasUIByDataSource(optHas)">
            Value
        </div>
        <div
            class="value"
            v-if="
                ((props.status === 'using' && wrappedConstant !== 0) || wrappedConstant === 1) &&
                optValue
            "
            :class="{ 'margin-top': optHas && hasUIByDataSource(optHas) }"
        >
            <RunningArgumentConstraintVue
                :layer="props.layer + 1"
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="{
                    outerValues: outerValues,
                    propValues: props.values.propValues,
                    innerValues: innerValues,
                }"
                :calling="props.calling"
                :canExportValues="canExportValues && optConstant === 1"
                :index="undefined"
                :recItems="props.recItems"
                :initial="optValue"
                :hasLabel="props.hasLabel"
                :triggerRefresh="props.triggerRefresh"
                @changed="onOptValueChanged"
                ref="valueRef"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-opt-argument-constraint-content {
    width: 100%;
    > .tip {
        width: 100%;
        height: 28px;
        display: flex;
        align-items: center;
    }
    > .value {
        &.margin-top {
            margin-top: 10px;
        }
        width: 100%;
    }
}
</style>
