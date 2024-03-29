<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../types/running/running';
import { RunningLight } from '../../../../../types/running/light';
import {
    ValueItem,
    findOuterValueItemsByDataSource,
    findInnerValueItemsByDataSource,
} from '../../../../../types/common/value';
import { DataSource } from '../../../../../types/parts/sources/sources';
import { checkAndExecute, DataResult, same, StringResult } from '../../../../../common';
import { checkDataSource } from '../check';
import {
    hasUIByDataSource,
    hasUIByDataSourceWithUsingStatus,
} from '../../../../../types/running/ui';
import { CandidValue } from '../@mora-light/core/types/candid';
import { restoreArg } from '../../../../../types/parts/sources/light';
import RunningLightWrappedSourceVue from './RunningLightWrappedSource.vue';

const parseDataResult = (
    data: DataSource[],
    canExportValues: boolean,
    innerValues: ValueItem[],
    outerValues: ValueItem[],
    refs: HTMLElement[],
): DataResult<DataSource>[] => {
    innerValues = [...innerValues];
    outerValues = [...outerValues];

    const itemsResults: DataResult<DataSource>[] = [];
    for (let i = 0; i < data.length; i++) {
        const r = checkDataSource(data[i], canExportValues, innerValues, undefined, refs[i]);
        itemsResults[i] = r.result;
        innerValues = r.innerValues;
        outerValues = r.outerValues!;
    }

    return itemsResults;
};

const props = defineProps({
    argResult: {
        type: Object as PropType<StringResult<CandidValue>>,
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
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true,
    },
    initial: {
        type: Array as PropType<DataSource[]>,
        required: true,
    },
});

const refs = ref<HTMLElement[]>([]);

let checkedOuterValues: ValueItem[] = [...props.outerValues];

const data = ref<DataSource[]>(props.initial);

const args = ref<(CandidValue | undefined)[]>([]); // Anti -tailoring results

let dataResults: DataResult<DataSource>[] = parseDataResult(
    data.value,
    true,
    [],
    props.outerValues,
    refs.value,
);

const dataInnerValues = computed(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = []; // Empty array starting

    result[0] = [...last];

    for (let i = 1; i < data.value.length; i++) {
        const source = data.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findInnerValueItemsByDataSource(source, valueItems);

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("dataInnerValues", result);

    return result;
});
const dataOuterValues = computed(() => {
    const result: ValueItem[][] = [];

    // console.error("data outer values", outerValues.value);

    let last: ValueItem[] = [...props.outerValues]; // Empty array starting

    result[0] = [...last];

    for (let i = 1; i < data.value.length; i++) {
        const source = data.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findOuterValueItemsByDataSource(source, valueItems, [...dataInnerValues.value[i]]);

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("dataOuterValues", result);

    return result;
});

const hasContents = computed(() => data.value.map((source) => hasUIByDataSource(source)));
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

watch(
    () => props.argResult,
    (nv) => {
        if (nv === undefined || nv.err !== undefined) {
            args.value = [];
            return;
        }
        // The value before cutting is restored
        args.value = restoreArg(data.value, nv.ok);
    },
);

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.outerValues, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedOuterValues = [...props.outerValues];

    const newData = props.initial;

    const newDataResults = parseDataResult(newData, true, [], newCheckedOuterValues, refs.value);

    if (
        initialed &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(data.value, newData) &&
        same(dataResults, newDataResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedOuterValues = newCheckedOuterValues;

    data.value = newData;

    dataResults = newDataResults;

    initialed = true;

    changed();
};

// Some do not need to be displayed at all
const showBorder = (source: DataSource) => {
    switch (source.source) {
        case 'combined':
            return false;
        case 'canister':
            // canister Need to judge whether there is a UI content
            return (
                hasUIByDataSource(source) ||
                (props.status === 'using' && hasUIByDataSourceWithUsingStatus(source))
            );
        case 'light':
            // light Need to judge whether there is a UI content
            return (
                hasUIByDataSource(source) ||
                (props.status === 'using' && hasUIByDataSourceWithUsingStatus(source))
            );
        case 'input':
            return false;
        case 'constant':
            return false;
        case 'inner':
            return false;
        case 'outer':
            return false;
    }
};

const onUsingDataSourceChanged = (i: number, r: DataResult<DataSource>) => {
    dataResults[i] = r;

    // console.error("onUsingLightDataSourceChanged", i, r);

    if (r.ok !== undefined) data.value[i] = r.ok;

    changed();
};

const produce = (): DataResult<DataSource[]> | undefined => {
    if (!initialed)
        return { err: { message: `${props.status} light wrapped sources has not been initial.` } };

    if (props.argResult === undefined) {
        return undefined;
    }
    if (props.argResult.err !== undefined) {
        return { err: { message: props.argResult.err } };
    }

    // Check whether there is an error in the dissemination data
    for (let i = 0; i < dataResults.length; i++) {
        const err = dataResults[i].err;
        if (err) return { err };
    }

    return { ok: dataResults.map((r) => r.ok!) };
};

const emit = defineEmits<{
    changed: [DataResult<DataSource[]> | undefined];
}>();

const changed = () =>
    checkAndExecute(
        refs.value.filter((v) => !!v).length >= data.value.length,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-light-wrapped-sources-content">
        <template v-if="data.length">
            <template v-for="(source, i) in data" :key="i">
                <RunningLightWrappedSourceVue
                    :argResult="args[i] !== undefined ? ({ ok: args[i] } as StringResult<CandidValue>) : undefined"
                    :triggerRefresh="props.triggerRefresh"
                    :status="props.status"
                    :index="i"
                    :runningLight="props.runningLight"
                    :parentSourceId="props.parentSourceId"
                    :calling="props.calling"
                    :canExportValues="true"
                    :innerValues="dataInnerValues[i]"
                    :outerValues="dataOuterValues[i]"
                    :initial="source"
                    @changed="(r) => onUsingDataSourceChanged(i, r)"
                    :ref="(el: any) => (refs[i] = el)"
                    :class="{ border: showBorder(source), 'margin-top': marginTop[i] }"
                />
            </template>
        </template>
        <template v-else>
            <!-- No content-->
            <template v-if="props.status === 'using'">
                <div class="empty-data">Countless sources of this light</div>
            </template>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-light-wrapped-sources-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    > .margin-top {
        margin-top: 5px;
    }

    > .border {
        border: 1px solid #ccc;
        padding: 5px;
    }

    > .empty-data {
        width: 100%;
        border: none;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px 0;
    }
}
</style>
