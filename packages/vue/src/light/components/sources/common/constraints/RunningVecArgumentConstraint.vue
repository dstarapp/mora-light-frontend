<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import {
    CheckedResult,
    ComponentStatus,
    RunningLight,
    ValueItem,
    checkArgumentConstraint,
    checkDataSource,
    findInnerValueItemsByArgumentConstraint,
    findOuterValueItemsByArgumentConstraint,
    findInnerValueItemsByDataSource,
    findOuterValueItemsByDataSource,
    hasUIByDataSource,
} from '@mora-light/core/types/running';
import {
    ArgumentConstraint,
    ArrayArgumentConstraintSubitem,
    VecArgumentConstraint,
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
    deepClone,
} from '@mora-light/core/types/common';
import {
    VecCandidType,
    CandidType,
    isSameCandidType,
    CandidValue,
    RecItem,
} from '@mora-light/core/types/candid';
import RunningWrappedSourceVue from '../../RunningWrappedSource.vue';
import RunningArgumentConstraintVue from '../RunningArgumentConstraint.vue';

const parseDataResult = (
    constant: number,
    length: DataSource | undefined,
    constraintSubitems: ArrayArgumentConstraintSubitem[] | undefined,
    canExportValues: boolean,
    values: { outerValues: ValueItem[]; propValues: ValueItem[]; innerValues: ValueItem[] },
    lengthEl: HTMLElement | undefined,
    subitemsEls: HTMLElement[],
): {
    lengthResult: DataResult<DataSource> | undefined;
    subitemsResults: DataResult<ArrayArgumentConstraintSubitem>[] | undefined;
} => {
    let outerValues = [...values.outerValues];
    let propValues = [...values.propValues];
    let innerValues = [...values.innerValues];

    let lengthResult: CheckedResult<DataSource> | undefined = undefined;
    if (length !== undefined) {
        lengthResult = checkDataSource(
            length,
            canExportValues,
            { outerValues, propValues, innerValues },
            lengthEl,
        );

        outerValues = lengthResult.values.outerValues!;
        innerValues = lengthResult.values.innerValues;
    }

    let subitemsResults: DataResult<ArrayArgumentConstraintSubitem>[] | undefined = undefined;
    if (constraintSubitems !== undefined) {
        subitemsResults = [];
        for (let i = 0; i < constraintSubitems.length; i++) {
            const constraint = constraintSubitems[i]?.constraint;
            if (constraint !== undefined) {
                const r = checkArgumentConstraint(
                    constraint,
                    canExportValues && constant > 0,
                    { outerValues, propValues, innerValues },
                    subitemsEls[i],
                );
                subitemsResults[i] = !r.result.err
                    ? { ok: constraintSubitems[i] }
                    : { err: r.result.err };
                outerValues = r.values.outerValues!;
                innerValues = r.values.innerValues;
            } else {
                subitemsResults[i] = { ok: constraintSubitems[i] };
            }
        }
    }

    return {
        lengthResult: lengthResult?.result,
        subitemsResults,
    };
};

const calcInnerValues = (
    propValues: ValueItem[],
    values: ValueItem[],
    wrappedConstant: number,
    vecSubitems: ArrayArgumentConstraintSubitem[],
    wrappedSubitems: ArgumentConstraint[],
    defaultConstraint: ArgumentConstraint,
    find: (
        c: ArgumentConstraint,
        values: { propValues: ValueItem[] },
        valueItems: ValueItem[],
    ) => void,
): ValueItem[][] => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...values]; // Passing data start

    result[0] = [...last];

    const length = Math.max(wrappedConstant, vecSubitems.length);
    if (length > 0) {
        for (let i = 1; i < length; i++) {
            const c = wrappedSubitems[i - 1] ?? vecSubitems[i].constraint ?? defaultConstraint; // Get the previous data source

            let valueItems: ValueItem[] = [...last];

            find(c, { propValues }, valueItems);

            last = valueItems;

            result[i] = [...last];
        }
    }

    return result;
};
const calcOuterValues = (
    propValues: ValueItem[],
    innerValues: ValueItem[][],
    values: ValueItem[],
    wrappedConstant: number,
    vecSubitems: ArrayArgumentConstraintSubitem[],
    wrappedSubitems: ArgumentConstraint[],
    defaultConstraint: ArgumentConstraint,
    find: (
        c: ArgumentConstraint,
        values: { propValues: ValueItem[]; innerValues: ValueItem[] },
        valueItems: ValueItem[],
    ) => void,
): ValueItem[][] => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...values]; // Passing data start

    result[0] = [...last];

    const length = Math.max(wrappedConstant, vecSubitems.length);
    if (length > 0) {
        for (let i = 1; i < length; i++) {
            const c = wrappedSubitems[i - 1] ?? vecSubitems[i].constraint ?? defaultConstraint; // Get the previous data source

            let valueItems: ValueItem[] = [...last];

            find(c, { propValues, innerValues: [...innerValues[i]] }, valueItems);

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
        type: Object as PropType<VecCandidType>,
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
        type: Object as PropType<VecArgumentConstraint>,
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

const lengthRef = ref<HTMLElement>();
const subitemsRefs = ref<HTMLElement[]>([]);
const setSubitemsRef = (el: any, i: number) => (subitemsRefs.value[i] = el);

let checkedType: CandidType = props.type;
let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.values.innerValues];
let checkedOuterValues: ValueItem[] = [...props.values.outerValues];

// The correct data is passed down down
const vecConstant = ref<number>(props.initial.constant);
const vecLength = ref<DataSource | undefined>(props.initial.length);
const vecSubitems = ref<ArrayArgumentConstraintSubitem[] | undefined>(props.initial.subitems);

const wrappedSubitems = ref<ArgumentConstraint[]>(props.initial.subitems2 ?? []);
const vecSubitemsRuntime = ref<(CandidValue | undefined)[]>([]);

// Receive data that is passed upward
let { lengthResult: vecLengthResult, subitemsResults: vecSubitemsResults } = parseDataResult(
    vecConstant.value,
    vecLength.value,
    vecSubitems.value,
    props.canExportValues,
    {
        outerValues: [...props.values.outerValues],
        propValues: props.values.propValues,
        innerValues: [...props.values.innerValues],
    },
    lengthRef.value,
    subitemsRefs.value,
);

const wrappedConstant = computed(() => {
    if (vecConstant.value >= 0) return vecConstant.value;
    const runtime = readRuntime<number>(
        vecLength.value ? findDataSourceType(vecLength.value) : undefined,
    );
    if (runtime?.ok !== undefined) {
        const value = runtime.ok;
        return value >= 0 ? value : -1;
    }
    return -1;
});

const checkWrappedSubitems = () => {
    const length = wrappedConstant.value;
    if (length <= 0) {
        wrappedSubitems.value = [];
        return;
    }
    if (vecSubitems.value === undefined) return;
    if (props.initial.default === undefined) return;

    const subitems = wrappedSubitems.value;

    while (subitems.length > length) subitems.splice(subitems.length - 1, 1);
    while (vecSubitemsRuntime.value.length > length)
        vecSubitemsRuntime.value.splice(subitems.length - 1, 1);

    for (let i = 0; i < length; i++) {
        if (subitems[i] !== undefined) continue;
        const subitem = vecSubitems.value[i];
        const constraint = subitem?.constraint ?? deepClone(props.initial.default);
        const runtime = vecSubitemsRuntime.value[i];
        if (runtime !== undefined) {
            assignRuntime(constraint, { ok: runtime });
        } else {
            deleteRuntime(constraint);
        }
        subitems[i] = constraint;
    }

    wrappedSubitems.value = subitems;
};
checkWrappedSubitems();
watch(
    () => [wrappedConstant.value, vecSubitems.value, props.initial.default],
    (nv, ov) => {
        if (same(nv, ov)) return;
        checkWrappedSubitems();
    },
);

// Each ArgumentConstraint on this page may add Inner Values
const innerValues = computed<ValueItem[][]>(() =>
    vecLength.value === undefined ||
    vecSubitems.value === undefined ||
    props.initial.default === undefined
        ? []
        : calcInnerValues(
              props.values.propValues,
              (() => {
                  const items = [...props.values.innerValues];
                  findInnerValueItemsByDataSource(
                      vecLength.value,
                      {
                          propValues: props.values.propValues,
                      },
                      items,
                  );
                  return items;
              })(),
              wrappedConstant.value,
              vecSubitems.value,
              wrappedSubitems.value,
              props.initial.default,
              findInnerValueItemsByArgumentConstraint,
          ),
);
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[][]>(() =>
    vecLength.value === undefined ||
    vecSubitems.value === undefined ||
    props.initial.default === undefined
        ? []
        : calcOuterValues(
              props.values.propValues,
              innerValues.value,
              ((innerValues: ValueItem[]) => {
                  const items = [...props.values.outerValues];
                  findOuterValueItemsByDataSource(
                      vecLength.value,
                      { propValues: props.values.propValues, innerValues: [...innerValues] },
                      items,
                  );
                  return items;
              })(innerValues.value[0]),
              wrappedConstant.value,
              vecSubitems.value,
              wrappedSubitems.value,
              props.initial.default,
              findOuterValueItemsByArgumentConstraint,
          ),
);

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

    const newVecConstant = props.initial.constant;
    const newVecLength = props.initial.length;
    const newVecSubitems = props.initial.subitems;

    const { lengthResult: newVecLengthResult, subitemsResults: newVecSubitemsResults } =
        parseDataResult(
            newVecConstant,
            newVecLength,
            newVecSubitems,
            newCheckedCanExportValues,
            {
                outerValues: [...newCheckedOuterValues],
                propValues: props.values.propValues,
                innerValues: [...newCheckedInnerValues],
            },
            lengthRef.value,
            subitemsRefs.value,
        );
    let newVecSubitemsRuntime = vecSubitemsRuntime.value;
    if (!isSameCandidType(checkedType, newCheckedType)) newVecSubitemsRuntime = [];

    if (
        initialed &&
        same(checkedType, newCheckedType) &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(vecConstant.value, newVecConstant) &&
        same(vecLength.value, newVecLength) &&
        same(vecSubitems.value, newVecSubitems) &&
        same(vecLengthResult, newVecLengthResult) &&
        same(vecSubitemsResults, newVecSubitemsResults) &&
        same(vecSubitemsRuntime.value, newVecSubitemsRuntime)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedType = newCheckedType;
    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    vecConstant.value = newVecConstant;
    vecLength.value = newVecLength;
    vecSubitems.value = newVecSubitems;

    vecLengthResult = newVecLengthResult;
    vecSubitemsResults = newVecSubitemsResults;

    vecSubitemsRuntime.value = newVecSubitemsRuntime;

    initialed = true;

    changed();
};

const onVecLengthChanged = (r: DataResult<DataSource>) => {
    vecLengthResult = r;

    if (r.ok !== undefined) vecLength.value = r.ok;

    changed();
};

const onVecSubItemsChanged = (i: number, r: DataResult<ArgumentConstraint>) => {
    if (vecSubitems.value === undefined) return;
    if (vecSubitemsResults === undefined) return;

    const item = vecSubitems.value[i];

    if (item?.constraint !== undefined) {
        // It is customized
        vecSubitemsResults[i] = r.err
            ? { err: r.err }
            : { ok: { type: 'custom', constraint: r.ok } };

        if (r.ok !== undefined) vecSubitems.value[i] = { type: 'custom', constraint: r.ok };
    }

    if (r.ok !== undefined) {
        wrappedSubitems[i] = r.ok;
        const runtime = readRuntime<number>(r.ok);
        if (runtime?.ok !== undefined)
            vecSubitemsRuntime.value[i] = runtime.ok; // In case it is worth recording
        else vecSubitemsRuntime.value[i] = undefined;
    } else {
        vecSubitemsRuntime.value[i] = undefined;
    }

    changed();
};

const produce = (): DataResult<VecArgumentConstraint> => {
    if (!initialed)
        return {
            err: { message: `${props.status} vec argument constraint has not been initial.` },
        };

    if (vecLengthResult?.err !== undefined) return { err: vecLengthResult.err };

    const ok: VecArgumentConstraint = props.initial;

    if (vecLengthResult?.ok) ok.length = vecLengthResult.ok;
    else delete ok.length;

    deleteRuntime(ok);
    delete ok['items2'];

    if (wrappedConstant.value === 0) {
        assignRuntime(ok, { ok: [] });
        return { ok };
    }

    if (vecSubitemsResults) {
        for (let i = 0; i < vecSubitemsResults.length; i++) {
            const err = vecSubitemsResults[i].err;
            if (err) return { err };
        }

        ok['items'] = vecSubitemsResults.map((r) => r.ok!);
        ok['items2'] = wrappedSubitems.value;
    }

    if (wrappedConstant.value > 0) {
        let runtime: CandidValue[] | undefined = [];
        for (let i = 0; i < wrappedConstant.value; i++) {
            const value = vecSubitemsRuntime.value[i];
            if (value === undefined) {
                runtime = undefined;
                break;
            }
            runtime[i] = value;
        }
        if (runtime !== undefined) assignRuntime(ok, { ok: runtime });
        return { ok };
    }

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<VecArgumentConstraint>];
}>();

const changed = () =>
    checkAndExecute(
        props.status !== 'using' ||
            (!!lengthRef.value &&
                (wrappedConstant.value <= 0 ||
                    subitemsRefs.value.filter((v) => !!v).length >= wrappedConstant.value)),
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-vec-argument-constraint-content">
        <template v-if="vecLength">
            <RunningWrappedSourceVue
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="vecLength"
                :triggerRefresh="props.triggerRefresh"
                @changed="onVecLengthChanged"
                ref="lengthRef"
                :vec-length="vecLength.source"
            />
        </template>
        <div
            class="tip"
            v-if="props.status === 'using' && vecLength && hasUIByDataSource(vecLength)"
        >
            List
        </div>
        <div
            class="items"
            v-if="props.status !== 'using' && wrappedConstant > 0"
            :class="{ 'margin-top': vecLength && hasUIByDataSource(vecLength) }"
        >
            <div class="item" v-for="(subitem, i) in wrappedSubitems" :key="i" :vec-index="i">
                <span>{{ `${i}` }}</span>
                <span class="colon">:</span>
                <RunningArgumentConstraintVue
                    :layer="props.layer + 1"
                    :status="props.status"
                    :parentSourceId="props.parentSourceId"
                    :runningLight="props.runningLight"
                    :values="{
                        outerValues: outerValues[i],
                        propValues: props.values.propValues,
                        innerValues: innerValues[i],
                    }"
                    :calling="props.calling"
                    :canExportValues="canExportValues && vecConstant > 0"
                    :index="i"
                    :recItems="props.recItems"
                    :initial="subitem"
                    :hasLabel="props.hasLabel"
                    :triggerRefresh="props.triggerRefresh"
                    @changed="(r) => onVecSubItemsChanged(i, r)"
                    :ref="(el) => setSubitemsRef(el, i)"
                />
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-vec-argument-constraint-content {
    width: 100%;
    > .tip {
        width: 100%;
        height: 28px;
        display: flex;
        align-items: center;
    }
    > .items {
        &.margin-top {
            margin-top: 10px;
        }
        width: 100%;
        > .item {
            margin-top: 10px;
            &:first-child {
                margin-top: 0px;
            }
            display: flex;
            flex-direction: row;
            justify-content: flex-start;
            align-items: flex-start;
            > span {
                width: 20px;
                height: 28px;
                flex-shrink: 0;
                display: flex;
                flex-direction: row;
                justify-content: center;
                align-items: flex-start;
                padding-top: 1px;
                font-size: 12px;
            }
            > .colon {
                width: 15px;
                flex-shrink: 0;
                justify-content: flex-start;
            }
        }
    }
}
</style>
