<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import {
    ComponentStatus,
    RunningLight,
    ValueItem,
    checkDataSource,
    findInnerValueItemsByDataSource,
    findOuterValueItemsByDataSource,
    hasUIByDataSource,
    hasUIByDataSourceWithUsingStatus,
} from '@mora-light/core/types/running';
import { DataSource } from '@mora-light/core/types/source';
import { checkAndExecute, DataResult, same } from '@mora-light/core/types/common';
import RunningWrappedSourceVue from './RunningWrappedSource.vue';

const parseDataResult = (
    data: DataSource[],
    canExportValues: boolean,
    values: { outerValues: ValueItem[]; propValues: ValueItem[]; innerValues: ValueItem[] },
    refs: HTMLElement[],
): DataResult<DataSource>[] => {
    let outerValues = [...values.outerValues];
    let propValues = [...values.propValues];
    let innerValues = [...values.innerValues];

    const itemsResults: DataResult<DataSource>[] = [];
    for (let i = 0; i < data.length; i++) {
        const r = checkDataSource(
            data[i],
            canExportValues,
            {
                outerValues: undefined,
                propValues,
                innerValues,
            },

            refs[i],
        );
        itemsResults[i] = r.result;
        innerValues = r.values.innerValues;
        outerValues = r.values.outerValues!;
    }

    return itemsResults;
};

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
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
        }>,
        required: true,
    },
    calling: {
        type: Number,
        required: true,
    },
    initial: {
        type: Array as PropType<DataSource[]>,
        required: true,
    },
    triggerRefresh: {
        type: Number,
        required: true,
    },
});

const refs = ref<HTMLElement[]>([]);

let checkedOuterValues: ValueItem[] = [...props.values.outerValues];

const data = ref<DataSource[]>(props.initial);

let dataResults: DataResult<DataSource>[] = parseDataResult(
    data.value,
    true,
    {
        outerValues: props.values.outerValues,
        propValues: props.values.propValues,
        innerValues: [],
    },
    refs.value,
);

const wrappedData = computed(() => {
    let simples: number[] = [];
    let actions: number[] = [];
    let canisters: number[] = [];
    for (let i = 0; i < data.value.length; i++) {
        switch (data.value[i].source) {
            case 'combined':
                actions.push(i);
                break;
            case 'canister':
                actions.push(i);
                canisters.push(i);
                break;
            default:
                simples.push(i);
        }
    }
    return { simples, actions, canisters };
});

const dataInnerValues = computed(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [];

    result[0] = [...last];

    for (let i = 1; i < data.value.length; i++) {
        const source = data.value[i - 1];

        let valueItems: ValueItem[] = [...last];

        findInnerValueItemsByDataSource(
            source,
            { propValues: props.values.propValues },
            valueItems,
        );

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("dataInnerValues", result);

    return result;
});
const dataOuterValues = computed(() => {
    const result: ValueItem[][] = [];

    // console.error("data outer values", outerValues.value);

    let last: ValueItem[] = [...props.values.outerValues];

    result[0] = [...last];

    for (let i = 1; i < data.value.length; i++) {
        const source = data.value[i - 1];

        let valueItems: ValueItem[] = [...last];

        findOuterValueItemsByDataSource(
            source,
            { propValues: props.values.propValues, innerValues: [...dataInnerValues.value[i]] },
            valueItems,
        );

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("dataOuterValues", result);

    return result;
});

const hasContents = computed(() => data.value.map((source) => hasUIByDataSource(source)));
const hasActionContent = computed<boolean>(
    () =>
        !!wrappedData.value.actions
            .map((i) => data.value[i])
            .map((source) => hasUIByDataSource(source))
            .find((s) => s),
);
const hasContentsWithUsingStatus = computed(() =>
    data.value.map((source) => hasUIByDataSourceWithUsingStatus(source)),
);
const marginTop = computed(() => {
    const r: boolean[] = [false];
    for (let i = 1; i < data.value.length; i++) {
        if (props.status === 'using') {
            r[i] = hasContentsWithUsingStatus.value[i];
            continue;
        }
        if (!hasContents.value[i]) {
            r[i] = false;
            continue;
        }
        let top = false;
        for (let j = i - 1; 0 <= j; j--) {
            if (hasContents.value[j]) {
                top = true;
                break;
            }
        }
        r[i] = top;
    }
    return r;
});

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.values, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedOuterValues = [...props.values.outerValues];

    const newData = props.initial;

    const newDataResults = parseDataResult(
        newData,
        true,
        {
            outerValues: newCheckedOuterValues,
            propValues: props.values.propValues,
            innerValues: [],
        },
        refs.value,
    );

    if (
        initialed &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(data.value, newData) &&
        same(dataResults, newDataResults)
    ) {
        return;
    }

    checkedOuterValues = newCheckedOuterValues;

    data.value = newData;

    dataResults = newDataResults;

    initialed = true;

    changed();
};

const showBorder = (source: DataSource) => {
    switch (source.source) {
        case 'light':
            return (
                hasUIByDataSource(source) ||
                (props.status === 'using' && hasUIByDataSourceWithUsingStatus(source))
            );
        case 'combined':
            return props.status === 'using' && source.exported?.target === 'outer';
        case 'canister':
            return (
                hasUIByDataSource(source) ||
                (props.status === 'using' && hasUIByDataSourceWithUsingStatus(source))
            );
        case 'input':
            return true;
        case 'constant':
            return props.status === 'using' && source.exported?.target === 'outer';
        case 'inner':
            return props.status === 'using' && source.exported?.target === 'outer';
        case 'prop':
            return props.status === 'using' && source.exported?.target === 'outer';
        case 'outer':
            return props.status === 'using';
    }
};

const onRunningDataSourceChanged = (i: number, r: DataResult<DataSource>) => {
    dataResults[i] = r;

    // console.error("onRunningDataSourceChanged", i, r);

    if (r.ok !== undefined) data.value[i] = r.ok;

    changed();
};

const produce = (): DataResult<DataSource[]> => {
    if (!initialed)
        return { err: { message: `${props.status} wrapped sources has not been initial.` } };

    for (let i = 0; i < dataResults.length; i++) {
        const err = dataResults[i].err;
        if (err) return { err };
    }

    return { ok: dataResults.map((r) => r.ok!) };
};

const emit = defineEmits<{
    changed: [DataResult<DataSource[]>];
}>();

const changed = () =>
    checkAndExecute(
        refs.value.filter((v) => !!v).length >= data.value.length,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-wrapped-sources-content">
        <template v-if="data.length">
            <div class="simples" v-if="wrappedData.simples.length">
                <template v-for="index in wrappedData.simples" :key="index">
                    <RunningWrappedSourceVue
                        :status="props.status"
                        :parentSourceId="0"
                        :runningLight="props.runningLight"
                        :values="{
                            outerValues: dataOuterValues[index],
                            propValues: props.values.propValues,
                            innerValues: dataInnerValues[index],
                        }"
                        :calling="props.calling"
                        :canExportValues="true"
                        :index="index"
                        :initial="data[index]"
                        :triggerRefresh="props.triggerRefresh"
                        @changed="(r) => onRunningDataSourceChanged(index, r)"
                        :ref="(el: any) => (refs[index] = el)"
                        :class="{ 'margin-bottom': showBorder(data[index]) }"
                    />
                </template>
            </div>
            <div
                class="actions"
                :class="{ 'has-content': hasActionContent }"
                v-if="wrappedData.actions.length"
            >
                <template v-for="index in wrappedData.actions" :key="index">
                    <RunningWrappedSourceVue
                        :status="props.status"
                        :parentSourceId="0"
                        :runningLight="props.runningLight"
                        :values="{
                            outerValues: dataOuterValues[index],
                            propValues: props.values.propValues,
                            innerValues: dataInnerValues[index],
                        }"
                        :calling="props.calling"
                        :canExportValues="true"
                        :index="index"
                        :initial="data[index]"
                        :triggerRefresh="props.triggerRefresh"
                        @changed="(r) => onRunningDataSourceChanged(index, r)"
                        :ref="(el: any) => (refs[index] = el)"
                        :class="{ 'margin-bottom': showBorder(data[index]) }"
                    />
                </template>
            </div>
        </template>
        <template v-else>
            <template v-if="props.status === 'using'">
                <div class="empty-data">
                    <i class="iconfont icon-no"></i>
                    <p>No Form</p>
                </div>
            </template>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-wrapped-sources-content {
    @apply w-full flex flex-col justify-center items-center;

    @media screen and (min-width: 0) and (max-width: 1240px) {
        > .margin-bottom {
            margin-bottom: 5px;
        }
    }
    .simples {
        width: 100%;
    }
    .actions {
        &.has-content {
            @apply w-full border border-dashed border-green-500 rounded-lg p-4 pb-2 mt-2 mb-5;
        }
    }
    > .empty-data {
        @apply w-full border-transparent flex justify-center items-center flex-col py-5 px-0;

        i {
            @apply text-6xl text-gray-300;
        }

        p {
            @apply text-base text-gray-400 mt-4;
        }
    }
}
</style>
