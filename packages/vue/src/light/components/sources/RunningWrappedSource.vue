<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import {
    ComponentStatus,
    RunningLight,
    ValueItem,
    checkDataSource,
    findInnerValueItemsByDataSource,
    findOuterValueItemsByDataSource,
} from '@mora-light/core/types/running';
import { DataSource } from '@mora-light/core/types/source';
import {
    checkAndAssignValue,
    checkAndExecute,
    DataResult,
    deepClone,
    ExportedInfo,
    ExportedOuter,
    readRuntime,
    same,
    StringResult,
} from '@mora-light/core/types/common';
import { CandidValue, findChildTypeAndValue, findAloneType } from '@mora-light/core/types/candid';
import { doTransform, findTransformToCandidType } from '@mora-light/core/types/transform';
import { findDataSourceType } from '@mora-light/core/types/source';
// import RunningLightSourceVue from './RunningLightSource.vue';
import RunningCombinedSourceVue from './RunningCombinedSource.vue';
import RunningCanisterSourceVue from './RunningCanisterSource.vue';
import RunningInputSourceVue from './RunningInputSource.vue';
import RunningConstantSourceVue from './RunningConstantSource.vue';
import RunningInnerSourceVue from './RunningInnerSource.vue';
import RunningPropSourceVue from './RunningPropSource.vue';
import RunningOuterSourceVue from './RunningOuterSource.vue';
import RunningExportedCandidTypeVue from '../exports/RunningExportedCandidType.vue';

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true,
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
    canExportValues: {
        type: Boolean,
        required: true,
    },
    index: {
        type: Number,
        required: false,
    },
    initial: {
        type: Object as PropType<DataSource>,
        required: true,
    },
    triggerRefresh: {
        type: Number,
        required: true,
    },
});

const sourceRef = ref<HTMLElement>();

let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.values.innerValues];
let checkedOuterValues: ValueItem[] = [...props.values.outerValues];

let sourceResult: DataResult<DataSource> = checkDataSource(
    props.initial,
    props.canExportValues,
    {
        outerValues: [...props.values.outerValues],
        propValues: props.values.propValues,
        innerValues: [...props.values.innerValues],
    },
    sourceRef.value,
).result;
let exportedResult: DataResult<ExportedInfo | undefined> = { ok: props.initial.exported };

const exportedOuterValues = computed(() => {
    const innerValues: ValueItem[] = [...props.values.innerValues];
    const trimSource = { ...props.initial, exported: undefined };
    const items = [...props.values.outerValues];
    findInnerValueItemsByDataSource(
        trimSource,
        { propValues: props.values.propValues },
        innerValues,
    );
    findOuterValueItemsByDataSource(
        trimSource,
        { propValues: props.values.propValues, innerValues },
        items,
    );
    return items;
});

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.canExportValues, props.values, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedCanExportValues = props.canExportValues;
    const newCheckedInnerValues = [...props.values.innerValues];
    const newCheckedOuterValues = [...props.values.outerValues];

    const newSource = props.initial;

    const newSourceResult = checkDataSource(
        newSource,
        newCheckedCanExportValues,
        {
            outerValues: [...newCheckedOuterValues],
            propValues: props.values.propValues,
            innerValues: [...newCheckedInnerValues],
        },
        sourceRef.value,
    ).result;
    const newExportedResult = { ok: newSource.exported };

    if (
        initialed &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(sourceResult, newSourceResult) &&
        same(exportedResult, newExportedResult)
    ) {
        return;
    }

    // console.error("using wrapped source init", JSON.stringify(newSourceResult));

    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    sourceResult = newSourceResult;
    exportedResult = newExportedResult;

    initialed = true;

    changed();
};

const onDataSourceChanged = (r: DataResult<DataSource>) => {
    if (r.err !== undefined && sourceResult.ok !== undefined) delete sourceResult.ok.runtime;

    sourceResult = r;

    // console.error("using wrapped source onDataSourceChanged", JSON.stringify(sourceResult));

    if (sourceResult.err !== undefined) {
        changed();
        return;
    }

    onRuntimeChanged();
};

const onExportedOuterChanged = (r: DataResult<ExportedOuter>) => {
    exportedResult = r;

    changed();
};

const onRuntimeChanged = async () => {
    if (sourceResult.err !== undefined) return;

    const source = sourceResult.ok;
    // 1.
    let runtimeResult: StringResult<CandidValue> | undefined = undefined;
    switch (source.source) {
        case 'light':
            runtimeResult = (() => {
                const result = readRuntime<CandidValue>(source.light.info.result);
                if (result === undefined) return result;
                if (result.err !== undefined) return result;
                const { value } = findChildTypeAndValue(
                    result.ok,
                    source.light.info.result,
                    source.light.info.child,
                );
                return { ok: value };
            })();
            break;
        case 'combined':
            runtimeResult = (() => {
                const result = readRuntime<CandidValue>(source.combined.from);
                if (result === undefined) return result;
                if (result.err !== undefined) return result;
                const { value } = findChildTypeAndValue(result.ok, source.combined.from, 0);
                return { ok: value };
            })();
            break;
        case 'canister':
            runtimeResult = (() => {
                const result = readRuntime<CandidValue>(source.canister.method.result);
                if (result === undefined) return result;
                if (result.err !== undefined) return result;
                const { value } = findChildTypeAndValue(
                    result.ok,
                    source.canister.method.result,
                    source.canister.method.child,
                );
                return { ok: value };
            })();
            break;
        case 'input':
            runtimeResult = readRuntime<CandidValue>(source.input.result);
            break;
        case 'constant':
            runtimeResult = readRuntime<CandidValue>(source.constant.result);
            break;
        case 'inner':
            runtimeResult = readRuntime<CandidValue>(source.inner.result);
            break;
        case 'prop':
            runtimeResult = readRuntime<CandidValue>(source.prop.result);
            break;
        case 'outer':
            runtimeResult = readRuntime<CandidValue>(source.outer.result);
            break;
    }
    // console.error(
    //     'using wrapped source runtime',
    //     props.initial.source,
    //     JSON.stringify(runtimeResult),
    // );

    // 2.
    if (runtimeResult === undefined) {
        delete source.runtime;
        changed();
        return;
    }

    if (runtimeResult.err !== undefined) {
        // 3.1
        source.runtime = deepClone(runtimeResult);
    } else {
        // 3.2
        let value: CandidValue = runtimeResult.ok;
        const transformResult = await doTransform(
            props.initial.transform,
            deepClone(value),
            props.status === 'running',
        );
        source.runtime = transformResult;
    }
    runtimeResult = deepClone(source.runtime);

    // console.error("using wrapped source runtime", source.type.runtime);

    // 4.
    changed();

    // 5.
    switch (source.exported?.target) {
        case 'inner':
            // console.error("using wrapped source pulse inner", source.exported.name);
            props.runningLight.innerPool.pulse(source.exported.name, runtimeResult);
            break;
        case 'outer':
            // console.error("using wrapped source pulse outer", source.exported.name);
            props.runningLight.outerPool.pulse(source.exported.name, runtimeResult);
            break;
    }
};

const produce = (): DataResult<DataSource> => {
    if (!initialed)
        return { err: { message: `${props.status} wrapped source has not been initial.` } };

    if (sourceResult.err !== undefined) return { err: sourceResult.err };
    if (exportedResult.err !== undefined) return { err: exportedResult.err };

    const ok: DataSource = sourceResult.ok;

    checkAndAssignValue(ok, 'exported', exportedResult.ok);

    // console.error("using wrapped produce", JSON.stringify(ok));

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSource>];
}>();

const changed = () => checkAndExecute(!!sourceRef.value, () => emit('changed', produce()), changed);
</script>

<template>
    <div class="running-wrapped-source-content">
        <template v-if="props.initial.source === 'light'">
            <div>TODO Data Source Light</div>
            <!-- <RunningLightSourceVue
                :triggerRefresh="props.triggerRefresh"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :parentSourceId="props.parentSourceId"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :innerValues="props.innerValues"
                :outerValues="props.outerValues"
                :initial="props.initial"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            /> -->
        </template>
        <template v-else-if="props.initial.source === 'combined'">
            <RunningCombinedSourceVue
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="props.initial"
                :triggerRefresh="props.triggerRefresh"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            />
        </template>
        <template v-else-if="props.initial.source === 'canister'">
            <RunningCanisterSourceVue
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="props.initial"
                :triggerRefresh="props.triggerRefresh"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            />
        </template>
        <template v-else-if="props.initial.source === 'input'">
            <RunningInputSourceVue
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :index="props.index"
                :initial="props.initial"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            />
        </template>
        <template v-else-if="props.initial.source === 'constant'">
            <RunningConstantSourceVue
                :status="props.status"
                :runningLight="props.runningLight"
                :index="props.index"
                :initial="props.initial"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            />
        </template>
        <template v-else-if="props.initial.source === 'inner'">
            <RunningInnerSourceVue
                :status="props.status"
                :runningLight="props.runningLight"
                :index="props.index"
                :initial="props.initial"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            />
        </template>
        <template v-else-if="props.initial.source === 'prop'">
            <RunningPropSourceVue
                :status="props.status"
                :runningLight="props.runningLight"
                :values="{ propValues: props.values.propValues }"
                :index="props.index"
                :initial="props.initial"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            />
        </template>
        <template v-else-if="props.initial.source === 'outer'">
            <RunningOuterSourceVue
                :status="props.status"
                :runningLight="props.runningLight"
                :values="{ outerValues: props.values.outerValues }"
                :index="props.index"
                :initial="props.initial"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            />
        </template>
        <template
            v-if="
                props.status === 'using' &&
                props.initial.exported &&
                props.initial.exported.target === 'outer'
            "
        >
            <RunningExportedCandidTypeVue
                :status="props.status"
                :outerValues="exportedOuterValues"
                :type="
                    findAloneType(
                        findTransformToCandidType(props.initial.transform) ??
                            findDataSourceType(props.initial),
                    ).type
                "
                :initial="props.initial.exported"
                @changed="onExportedOuterChanged"
                class="exported-outer"
            />
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-wrapped-source-content {
    @apply w-full;
    > .exported-outer {
        @apply mt-1;
    }
}
</style>
