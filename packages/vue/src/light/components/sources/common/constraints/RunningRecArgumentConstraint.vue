<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import {
    ComponentStatus,
    RunningLight,
    ValueItem,
    checkArgumentConstraint,
} from '@mora-light/core/types/running';
import { ArgumentConstraint, MainRecArgumentConstraint } from '@mora-light/core/types/source';
import {
    assignRuntime,
    checkAndExecute,
    DataResult,
    deepClone,
    deleteRuntime,
    readRuntime,
    same,
} from '@mora-light/core/types/common';
import {
    MainRecCandidType,
    CandidType,
    RecItem,
    findRecType,
    RecCandidType,
} from '@mora-light/core/types/candid';
import RunningArgumentConstraintVue from '../RunningArgumentConstraint.vue';

const getMainRecCandidType = (
    type: RecCandidType,
    recItems: RecItem[],
    id: number,
): MainRecCandidType => {
    if (type.subtype !== undefined) return deepClone(type);
    const found = findRecType(recItems, id);
    if (found === undefined) throw new Error('can not find rec type');
    return deepClone(found);
};

const parseDataResult = (
    value: ArgumentConstraint,
    canExportValues: boolean,
    values: { outerValues: ValueItem[]; propValues: ValueItem[]; innerValues: ValueItem[] },
    valueEl: HTMLElement | undefined,
): {
    valueResult: DataResult<ArgumentConstraint>;
} => {
    let outerValues = [...values.outerValues];
    let propValues = [...values.propValues];
    let innerValues = [...values.innerValues];

    let valueResult: DataResult<ArgumentConstraint> = checkArgumentConstraint(
        value,
        canExportValues,
        { outerValues, propValues, innerValues },
        valueEl,
    ).result;

    return {
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
        type: Object as PropType<RecCandidType>,
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
        type: Object as PropType<MainRecArgumentConstraint>,
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

const valueRef = ref<HTMLElement>();

let checkedRecItems: RecItem[] = props.recItems;
let checkedType: RecCandidType = props.type;
let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.values.innerValues];
let checkedOuterValues: ValueItem[] = [...props.values.outerValues];

// The correct data is passed down down
const type = ref<MainRecCandidType>(
    getMainRecCandidType(props.type, props.recItems, props.type.id),
);
const subtype = computed<CandidType>(() => type.value.subtype);
const mainRecValue = ref<ArgumentConstraint>(props.initial.value);

let { valueResult: mainRecValueResult } = parseDataResult(
    mainRecValue.value,
    props.canExportValues,
    {
        outerValues: [...props.values.outerValues],
        propValues: props.values.propValues,
        innerValues: [...props.values.innerValues],
    },
    valueRef.value,
);

const innerValues = computed<ValueItem[]>(() => {
    let last: ValueItem[] = [...props.values.innerValues]; // Passing data start
    return last;
});
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[]>(() => {
    let last: ValueItem[] = [...props.values.outerValues]; // Passing data start
    return last;
});

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.recItems, props.type, props.canExportValues, props.values, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedRecItems = props.recItems;
    const newCheckedType = props.type;
    const newCheckedCanExportValues = props.canExportValues;
    const newCheckedInnerValues: ValueItem[] = [...props.values.innerValues];
    const newCheckedOuterValues: ValueItem[] = [...props.values.outerValues];

    const newType = getMainRecCandidType(newCheckedType, newCheckedRecItems, newCheckedType.id);
    const newMainRecValue = props.initial.value;

    let { valueResult: newMainRecValueResult } = parseDataResult(
        newMainRecValue,
        newCheckedCanExportValues,
        {
            outerValues: [...newCheckedOuterValues],
            propValues: props.values.propValues,
            innerValues: [...newCheckedInnerValues],
        },
        valueRef.value,
    );

    if (
        initialed &&
        same(checkedRecItems, newCheckedRecItems) &&
        same(checkedType, newCheckedType) &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(type.value, newType) &&
        same(mainRecValue.value, newMainRecValue) &&
        same(mainRecValueResult, newMainRecValueResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    // console.error('rec type', newType, newMainRecValue);

    checkedRecItems = newCheckedRecItems;
    checkedType = newCheckedType;
    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    type.value = newType;
    mainRecValue.value = newMainRecValue;

    mainRecValueResult = newMainRecValueResult;

    initialed = true;

    changed();
};

const onValueChanged = (r: DataResult<ArgumentConstraint>) => {
    mainRecValueResult = r;

    // console.error('rec onValueChanged', r);

    if (r.ok !== undefined) mainRecValue.value = r.ok;

    changed();
};

const produce = (): DataResult<MainRecArgumentConstraint> => {
    if (!initialed)
        return {
            err: { message: `${props.status} main rec argument constraint has not been initial.` },
        };

    const ok: MainRecArgumentConstraint = props.initial;

    if (mainRecValueResult.err !== undefined) {
        deleteRuntime(ok);
        return { err: mainRecValueResult.err };
    }

    assignRuntime(ok, readRuntime(mainRecValueResult.ok));

    // console.error('rec produce', ok);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<MainRecArgumentConstraint>];
}>();

const changed = () =>
    checkAndExecute(
        props.status !== 'using' || !!valueRef.value,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-rec-argument-constraint-content">
        <div class="value">
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
                :canExportValues="canExportValues"
                :index="undefined"
                :recItems="props.recItems"
                :initial="mainRecValue"
                :hasLabel="props.hasLabel"
                :triggerRefresh="props.triggerRefresh"
                @changed="onValueChanged"
                ref="valueRef"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-rec-argument-constraint-content {
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
