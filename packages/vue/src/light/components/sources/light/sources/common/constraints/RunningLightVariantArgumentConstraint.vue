<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../../../types/running/running';
import { RunningLight } from '../../../../../../../types/running/light';
import {
    CandidType,
    CandidValueObject,
    VariantCandidType,
} from '../../../@mora-light/core/types/candid';
import {
    ValueItem,
    findOuterValueItemsByArgumentConstraint,
    findInnerValueItemsByArgumentConstraint,
    findInnerValueItemsByDataSource,
    findOuterValueItemsByDataSource,
} from '../../../../../../../types/common/value';
import {
    ArgumentConstraint,
    VariantArgumentConstraint,
} from '../../../../../../../types/parts/sources/arg';
import { checkDataSource, checkArgumentConstraint } from '../../../../../../../types/common/check';
import { DataResult, same } from '../../../../../../../common';
import { DataSource } from '../../../../../../../types/parts/sources/sources';

const parseDataResult = (
    constant: string,
    select: DataSource,
    type: VariantCandidType,
    constraint: ArgumentConstraint[],
    canExportValues: boolean,
    innerValues: ValueItem[],
    outerValues: ValueItem[],
    selectEl: HTMLElement | undefined,
    itemsEls: HTMLElement[],
): {
    selectResult: DataResult<DataSource>;
    itemsResults: DataResult<ArgumentConstraint>[];
} => {
    innerValues = [...innerValues];
    outerValues = [...outerValues];

    const selectResult = checkDataSource(
        select,
        canExportValues,
        innerValues,
        outerValues,
        selectEl,
    );

    innerValues = selectResult.innerValues;
    outerValues = selectResult.outerValues!;

    const itemsResults: DataResult<ArgumentConstraint>[] = [];
    for (let i = 0; i < items.length; i++) {
        const r = checkArgumentConstraint(
            items[i],
            canExportValues && constant === type.items[i].key,
            innerValues,
            outerValues,
            itemsEls[i],
        );
        itemsResults[i] = r.result;
        innerValues = r.innerValues;
        outerValues = r.outerValues!;
    }

    return {
        selectResult: selectResult.result,
        itemsResults: itemsResults,
    };
};

const props = defineProps({
    layer: {
        type: Number,
        required: true, // The top layer is displayed wrong, so it is necessary to record the level
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
        type: Object as PropType<VariantCandidType>,
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
        type: Object as PropType<VariantArgumentConstraint>,
        required: true,
    },
});

let checkedType: CandidType = props.type;
let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.innerValues];
let checkedOuterValues: ValueItem[] = [...props.outerValues];

// The correct data is passed down down
const variantConstant = ref<string>(props.initial.constant);
const variantSelect = ref<DataSource>(props.initial.select);
const variantItems = ref<ArgumentConstraint[]>(props.initial.items);

// Receive data that is passed upward
let { selectResult: variantSelectResult, itemsResults: variantItemsResults } = parseDataResult(
    variantConstant.value,
    variantSelect.value,
    props.type,
    variantItems.value,
    props.canExportValues,
    [...props.innerValues],
    [...props.outerValues],
    undefined,
    [],
);

const wrappedConstant = computed(() => {
    if (variantConstant.value) return variantConstant.value;
    if (variantSelect.value.type.runtime?.ok !== undefined) {
        const keys = Object.keys(variantSelect.value.type.runtime.ok as CandidValueObject);
        if (keys.length > 0) return keys[0];
    }
    return '';
});

// Each ArgumentConstraint on this page may add Inner Values
const innerValues = computed<ValueItem[][]>(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...props.innerValues]; // Passing data start

    findInnerValueItemsByDataSource(variantSelect.value, last);

    result[0] = [...last];

    for (let i = 1; i < variantItems.value.length; i++) {
        const c = variantItems.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findInnerValueItemsByArgumentConstraint(c, valueItems);

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("innerValues variant argument constraint", result);

    return result;
});
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[][]>(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...props.outerValues]; // Passing data start

    findOuterValueItemsByDataSource(variantSelect.value, last, [...innerValues.value[0]]);

    result[0] = [...last];

    for (let i = 1; i < variantItems.value.length; i++) {
        const c = variantItems.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findOuterValueItemsByArgumentConstraint(c, valueItems, [...innerValues.value[i]]);

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("outerValues variant argument constraint", result);

    return result;
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

    const newVariantConstant = props.initial.constant;
    const newVariantSelect = props.initial.select;
    const newVariantItems = props.initial.items;

    const { selectResult: newVariantSelectResult, itemsResults: newVariantItemsResults } =
        parseDataResult(
            newVariantConstant,
            newVariantSelect,
            newCheckedType,
            newVariantItems,
            newCheckedCanExportValues,
            [...newCheckedInnerValues],
            [...newCheckedOuterValues],
            undefined,
            [],
        );

    if (
        initialed &&
        same(checkedType, newCheckedType) &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(variantConstant.value, newVariantConstant) &&
        same(variantSelect.value, newVariantSelect) &&
        same(variantItems.value, newVariantItems) &&
        same(variantSelectResult, newVariantSelectResult) &&
        same(variantItemsResults, newVariantItemsResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedType = newCheckedType;
    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    variantConstant.value = newVariantConstant;
    variantSelect.value = newVariantSelect;
    variantItems.value = newVariantItems;

    variantSelectResult = newVariantSelectResult;
    variantItemsResults = newVariantItemsResults;

    initialed = true;

    changed();
};

const produce = (): DataResult<VariantArgumentConstraint> => {
    if (!initialed)
        return {
            err: {
                message: `${props.status} light variant argument constraint has not been initial.`,
            },
        };

    if (variantSelectResult.err !== undefined) return { err: variantSelectResult.err };

    const ok: VariantArgumentConstraint = props.initial;

    ok.select = variantSelectResult.ok;

    delete ok.runtime;

    if (wrappedConstant.value) {
        for (let i = 0; i < props.type.items.length; i++) {
            if (wrappedConstant.value === props.type.items[i].key) {
                const err = variantItemsResults[i].err;
                if (err) return { err };
                ok.items[i] = variantItemsResults[i].ok!; // If you have a choice value, you can just replace that value
                const runtimeResult = ok.items[i].runtime;
                if (runtimeResult?.ok !== undefined) {
                    const runtime = {};
                    runtime[wrappedConstant.value] = runtimeResult;
                    ok.runtime = { ok: runtime };
                }
                return { ok };
            }
        }
    }

    for (let i = 0; i < variantItemsResults.length; i++) {
        const err = variantItemsResults[i].err;
        if (err) return { err };
    }

    ok.items = variantItemsResults.map((r) => r.ok!); // Replace items

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<VariantArgumentConstraint>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-light-variant-argument-constraint-content"></div>
</template>

<style lang="less" scoped>
.running-light-variant-argument-constraint-content {
    width: 100%;
}
</style>
