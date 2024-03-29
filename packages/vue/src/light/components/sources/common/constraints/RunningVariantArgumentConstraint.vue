<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import {
    ComponentStatus,
    RunningLight,
    ValueItem,
    checkArgumentConstraint,
    findInnerValueItemsByArgumentConstraint,
    findOuterValueItemsByArgumentConstraint,
    checkDataSource,
    findInnerValueItemsByDataSource,
    findOuterValueItemsByDataSource,
} from '@mora-light/core/types/running';
import {
    ArgumentConstraint,
    DataSource,
    VariantArgumentConstraint,
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
import {
    CandidType,
    CandidValueObject,
    RecItem,
    VariantCandidType,
} from '@mora-light/core/types/candid';
import RunningWrappedSourceVue from '../../RunningWrappedSource.vue';
import RunningArgumentConstraintVue from '../RunningArgumentConstraint.vue';

const parseDataResult = (
    constant: string,
    valueConstraint: ArgumentConstraint | undefined,
    select: DataSource | undefined,
    type: VariantCandidType,
    constraints: ArgumentConstraint[] | undefined,
    canExportValues: boolean,
    values: { outerValues: ValueItem[]; propValues: ValueItem[]; innerValues: ValueItem[] },
    valueEl: HTMLElement | undefined,
    selectEl: HTMLElement | undefined,
    subitemsEls: HTMLElement[],
): {
    valueResult: DataResult<ArgumentConstraint> | undefined;
    selectResult: DataResult<DataSource> | undefined;
    subitemsResults: DataResult<ArgumentConstraint>[];
} => {
    let outerValues = [...values.outerValues];
    let propValues = [...values.propValues];
    let innerValues = [...values.innerValues];

    if (valueConstraint) {
        const r = checkArgumentConstraint(
            valueConstraint,
            canExportValues,
            { outerValues, propValues, innerValues },
            valueEl,
        );
        return {
            valueResult: r.result,
            selectResult: undefined,
            subitemsResults: [],
        };
    }

    if (select === undefined || constraints === undefined) {
        throw new Error(`select or constraints can noe be undefined`);
    }

    const selectResult = checkDataSource(
        select,
        canExportValues,
        { outerValues, propValues, innerValues },
        selectEl,
    );

    outerValues = selectResult.values.outerValues!;
    innerValues = selectResult.values.innerValues;

    const subitemsResults: DataResult<ArgumentConstraint>[] = [];
    for (let i = 0; i < constraints.length; i++) {
        const r = checkArgumentConstraint(
            constraints[i],
            canExportValues && constant === type.subitems[i].key,
            { outerValues, propValues, innerValues },
            subitemsEls[i],
        );
        subitemsResults[i] = r.result;
        outerValues = r.values.outerValues!;
        innerValues = r.values.innerValues;
    }

    return {
        valueResult: undefined,
        selectResult: selectResult.result,
        subitemsResults,
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
        type: Object as PropType<VariantCandidType>,
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
        type: Object as PropType<VariantArgumentConstraint>,
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
const selectRef = ref<HTMLElement>();
const subitemsRefs = ref<HTMLElement[]>([]);
const setSubitemsRef = (el: any, i: number) => (subitemsRefs.value[i] = el);

let checkedType: CandidType = props.type;
let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.values.innerValues];
let checkedOuterValues: ValueItem[] = [...props.values.outerValues];

// The correct data is passed down down
const variantConstant = ref<string>(props.initial.constant);
const variantValue = ref<ArgumentConstraint | undefined>(props.initial.value);
const variantSelect = ref<DataSource | undefined>(props.initial.select);
const variantSubitems = ref<ArgumentConstraint[]>(props.initial.subitems ?? []);

// Receive data that is passed upward
let {
    valueResult: variantValueResult,
    selectResult: variantSelectResult,
    subitemsResults: variantSubitemsResults,
} = parseDataResult(
    variantConstant.value,
    variantValue.value,
    variantSelect.value,
    props.type,
    variantSubitems.value,
    props.canExportValues,
    {
        outerValues: [...props.values.outerValues],
        propValues: props.values.propValues,
        innerValues: [...props.values.innerValues],
    },
    valueRef.value,
    selectRef.value,
    subitemsRefs.value,
);

const wrappedConstant = computed(() => {
    if (variantConstant.value) return variantConstant.value;
    const runtime = readRuntime<CandidValueObject>(
        variantSelect.value ? findDataSourceType(variantSelect.value) : undefined,
    );
    if (runtime?.ok !== undefined) {
        const keys = Object.keys(runtime.ok);
        if (keys.length > 0) return keys[0];
    }
    return '';
});

// Each ArgumentConstraint on this page may add Inner Values
const innerValues = computed<ValueItem[][]>(() => {
    const result: ValueItem[][] = [];

    if (variantSelect.value && variantSubitems.value) {
        let last: ValueItem[] = [...props.values.innerValues]; // Passing data start

        findInnerValueItemsByDataSource(
            variantSelect.value,
            {
                propValues: props.values.propValues,
            },
            last,
        );

        result[0] = [...last];

        for (let i = 1; i < variantSubitems.value.length; i++) {
            const c = variantSubitems.value[i - 1]; // Get the previous data source

            let valueItems: ValueItem[] = [...last];

            findInnerValueItemsByArgumentConstraint(
                c,
                {
                    propValues: props.values.propValues,
                },
                valueItems,
            );

            last = valueItems;

            result[i] = [...last];
        }
    }

    // console.error("innerValues variant argument constraint", result);

    return result;
});
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[][]>(() => {
    const result: ValueItem[][] = [];

    if (variantSelect.value && variantSubitems.value) {
        let last: ValueItem[] = [...props.values.outerValues]; // Passing data start

        findOuterValueItemsByDataSource(
            variantSelect.value,
            { propValues: props.values.propValues, innerValues: [...innerValues.value[0]] },
            last,
        );

        result[0] = [...last];

        for (let i = 1; i < variantSubitems.value.length; i++) {
            const c = variantSubitems.value[i - 1]; // Get the previous data source

            let valueItems: ValueItem[] = [...last];

            findOuterValueItemsByArgumentConstraint(
                c,
                { propValues: props.values.propValues, innerValues: [...innerValues.value[i]] },
                valueItems,
            );

            last = valueItems;

            result[i] = [...last];
        }
    }

    // console.error("outerValues variant argument constraint", result);

    return result;
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

    const newVariantConstant = props.initial.constant;
    const newVariantValue = props.initial.value;
    const newVariantSelect = props.initial.select;
    const newVariantSubitems = props.initial.subitems ?? [];

    const {
        valueResult: newVariantValueResult,
        selectResult: newVariantSelectResult,
        subitemsResults: newVariantSubitemsResults,
    } = parseDataResult(
        newVariantConstant,
        newVariantValue,
        newVariantSelect,
        newCheckedType,
        newVariantSubitems,
        newCheckedCanExportValues,
        {
            outerValues: [...newCheckedOuterValues],
            propValues: props.values.propValues,
            innerValues: [...newCheckedInnerValues],
        },
        valueRef.value,
        selectRef.value,
        subitemsRefs.value,
    );

    if (
        initialed &&
        same(checkedType, newCheckedType) &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(variantConstant.value, newVariantConstant) &&
        same(variantValue.value, newVariantValue) &&
        same(variantSelect.value, newVariantSelect) &&
        same(variantSubitems.value, newVariantSubitems) &&
        same(variantValueResult, newVariantValueResult) &&
        same(variantSelectResult, newVariantSelectResult) &&
        same(variantSubitemsResults, newVariantSubitemsResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }
    // console.error('newCheckedType', newCheckedType);
    // console.error('newVariantConstant', newVariantConstant);
    // console.error('newVariantValue', newVariantValue);
    // console.error('newVariantSelect', newVariantSelect);
    // console.error('newVariantSubitems', newVariantSubitems);
    checkedType = newCheckedType;
    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    variantConstant.value = newVariantConstant;
    variantValue.value = newVariantValue;
    variantSelect.value = newVariantSelect;
    variantSubitems.value = newVariantSubitems;

    variantValueResult = newVariantValueResult;
    variantSelectResult = newVariantSelectResult;
    variantSubitemsResults = newVariantSubitemsResults;

    initialed = true;

    changed();
};

const onVariantValueChanged = (r: DataResult<ArgumentConstraint>) => {
    if (variantValueResult === undefined) return;

    variantValueResult = r;

    if (r.ok !== undefined) variantValue.value = r.ok;

    changed();
};

const onVariantSelectChanged = (r: DataResult<DataSource>) => {
    if (variantSelectResult === undefined) return;

    variantSelectResult = r;

    if (r.ok !== undefined) variantSelect.value = r.ok;

    changed();
};

const onVariantSubitemsChanged = (i: number, r: DataResult<ArgumentConstraint>) => {
    if (variantSubitemsResults === undefined || variantSubitems.value === undefined) return;

    // console.error('onVariantSubitemsChanged', i, r);

    variantSubitemsResults[i] = r;

    if (r.ok !== undefined) variantSubitems.value[i] = r.ok;

    changed();
};

const produce = (): DataResult<VariantArgumentConstraint> => {
    if (!initialed)
        return {
            err: { message: `${props.status} variant argument constraint has not been initial.` },
        };

    if (variantSelectResult?.err !== undefined) return { err: variantSelectResult.err };

    const ok: VariantArgumentConstraint = props.initial;

    if (variantSelectResult?.ok) ok.select = variantSelectResult.ok;
    else delete ok.select;

    deleteRuntime(ok);

    if (variantValueResult !== undefined) {
        if (variantValueResult.err !== undefined) return { err: variantValueResult.err };
        const runtimeResult = readRuntime(variantValueResult.ok);
        if (runtimeResult?.ok !== undefined) {
            const runtime = {};
            runtime[wrappedConstant.value] = runtimeResult.ok;
            assignRuntime(ok, { ok: runtime });
        }
    } else {
        if (variantSubitemsResults && ok.subitems) {
            if (wrappedConstant.value) {
                for (let i = 0; i < props.type.subitems.length; i++) {
                    if (wrappedConstant.value === props.type.subitems[i].key) {
                        const err = variantSubitemsResults[i].err;
                        if (err) return { err };
                        ok.subitems[i] = variantSubitemsResults[i].ok!; // If you have a choice value, you can just replace that value
                        const runtimeResult = readRuntime(ok.subitems[i]);
                        if (runtimeResult?.ok !== undefined) {
                            const runtime = {};
                            runtime[wrappedConstant.value] = runtimeResult.ok;
                            assignRuntime(ok, { ok: runtime });
                        }
                        return { ok };
                    }
                }
            }
        }

        if (variantSubitemsResults) {
            for (let i = 0; i < variantSubitemsResults.length; i++) {
                const err = variantSubitemsResults[i].err;
                if (err) return { err };
            }
        }

        if (variantSubitemsResults && variantSubitemsResults.length) {
            ok.subitems = variantSubitemsResults.map((r) => r.ok!); // Replace subitems
        }
    }

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<VariantArgumentConstraint>];
}>();

const changed = () =>
    checkAndExecute(
        (props.status !== 'using' ||
            (!variantSelect.value
                ? !wrappedConstant.value || !!valueRef.value
                : !!selectRef.value &&
                  subitemsRefs.value.filter((v) => !!v).length >= variantSubitems.value.length)) &&
            variantSubitemsResults.length >= variantSubitems.value.length,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-variant-argument-constraint-content">
        <template v-if="wrappedConstant && variantValue">
            <RunningArgumentConstraintVue
                :layer="props.layer + 1"
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :canExportValues="canExportValues && !!variantConstant"
                :index="undefined"
                :recItems="props.recItems"
                :initial="variantValue"
                :hasLabel="props.hasLabel"
                :triggerRefresh="props.triggerRefresh"
                @changed="onVariantValueChanged"
            />
        </template>
        <template v-if="variantSelect">
            <RunningWrappedSourceVue
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="variantSelect"
                :triggerRefresh="props.triggerRefresh"
                @changed="onVariantSelectChanged"
                ref="selectRef"
                :variant-select="variantSelect.source"
            />

            <div class="items">
                <template v-for="(subitem, i) in variantSubitems" :key="i">
                    <div
                        class="item"
                        :ref="(el) => setSubitemsRef(el, i)"
                        :class="{
                            'margin-top':
                                !wrappedConstant || wrappedConstant === props.type.subitems[i].key,
                        }"
                        :variant-key="props.type.subitems[i].key"
                    >
                        <template
                            v-if="
                                !wrappedConstant || wrappedConstant === props.type.subitems[i].key
                            "
                        >
                            <template v-if="!wrappedConstant">
                                <div class="radio">
                                    <input :value="props.type.subitems[i].key" type="radio" />
                                </div>
                            </template>
                            <input
                                class="key"
                                type="text"
                                disabled
                                :value="props.type.subitems[i].key"
                            />
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
                                :canExportValues="canExportValues && !!variantConstant"
                                :index="i"
                                :recItems="props.recItems"
                                :initial="subitem"
                                :hasLabel="props.hasLabel"
                                :triggerRefresh="props.triggerRefresh"
                                @changed="(r) => onVariantSubitemsChanged(i, r)"
                            />
                        </template>
                    </div>
                </template>
            </div>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-variant-argument-constraint-content {
    width: 100%;
    > .items {
        width: 100%;
        > .item {
            &.margin-top {
                margin-top: 10px;
            }
            display: flex;
            flex-direction: row;
            justify-content: flex-start;
            align-items: flex-start;
            > .radio {
                margin-right: 10px;
                height: 28px;
                display: flex;
                align-items: center;
            }
            > .key {
                margin-right: 10px;
                width: 120px;
                height: 28px;
                border: 1px solid #77777755;
                padding-left: 5px;
            }
        }
    }
}
</style>
