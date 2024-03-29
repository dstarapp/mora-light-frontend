<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../types/running/running';
import { RunningLight } from '../../../../../types/running/light';
import { checkDataSource } from '../check';
import {
    ValueItem,
    findOuterValueItemsByDataSource,
    findInnerValueItemsByDataSource,
} from '../../../../../types/common/value';
import { DataSource } from '../../../../../types/parts/sources/sources';
import {
    deepClone,
    checkAndAssignValue,
    checkAndExecute,
    DataResult,
    same,
    StringResult,
} from '../../../../../common';
import { ExportedInfo, ExportedOuter } from '../../../../../types/types/exported';
import { CandidValue, findChildType } from '../@mora-light/core/types/candid';
import { doTransform } from '../../../../../types/transform/transform';
import RunningLightCanisterSourceVue from './RunningLightCanisterSource.vue';
import RunningLightLightSourceVue from './RunningLightLightSource.vue';
import RunningLightInputSourceVue from './RunningLightInputSource.vue';
import RunningLightConstantSourceVue from './RunningLightConstantSource.vue';
import RunningLightInnerSourceVue from './RunningLightInnerSource.vue';
import RunningLightOuterSourceVue from './RunningLightOuterSource.vue';

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
    initial: {
        type: Object as PropType<DataSource>,
        required: true,
    },
});

const sourceRef = ref<HTMLElement>();

let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.innerValues];
let checkedOuterValues: ValueItem[] = [...props.outerValues];

let sourceResult: DataResult<DataSource> = checkDataSource(
    props.initial,
    props.canExportValues,
    [...props.innerValues],
    [...props.outerValues],
    sourceRef.value,
).result;
let exportedResult: DataResult<ExportedInfo | undefined> = { ok: props.initial.exported };

// Both the main content and export part of this page need to use Outer values
// The main part can be used directly, because it is the only fork
// Outer values used in the exporting part have the main part of the main part and modification. Then, you need to make up
const exportedOuterValues = computed(() => {
    const innerValues: ValueItem[] = [...props.innerValues];
    const trimSource = { ...props.initial, exported: undefined }; // Construct a temporary data copy，Remove its export data
    const items = [...props.outerValues];
    findInnerValueItemsByDataSource(trimSource, innerValues);
    findOuterValueItemsByDataSource(trimSource, items, innerValues);
    return items;
});

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.canExportValues, props.innerValues, props.outerValues, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedCanExportValues = props.canExportValues;
    const newCheckedInnerValues = [...props.innerValues];
    const newCheckedOuterValues = [...props.outerValues];

    const newSource = props.initial;

    const newSourceResult = checkDataSource(
        newSource,
        newCheckedCanExportValues,
        [...newCheckedInnerValues],
        [...newCheckedOuterValues],
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
        return; // If the upcoming value is the same as that of this component, it will not be triggered
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
    if (r.err !== undefined && sourceResult.ok !== undefined) delete sourceResult.ok.type.runtime;

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
    if (sourceResult.err !== undefined) return; // Give up without the correct result

    const source = sourceResult.ok;

    // 1. Get the value of the data source
    let runtimeResult: StringResult<CandidValue> | undefined = undefined;
    switch (source.source) {
        case 'combined':
            runtimeResult = (() => {
                // Need to extract the sub -item value
                const result = source.combined.info.result.runtime;
                if (result === undefined) return result;
                if (result.err !== undefined) return result;
                const { value } = findChildType(source.combined.info.result, 0, result.ok);
                return { ok: value };
            })();
            break;
        case 'canister':
            runtimeResult = (() => {
                // Need to extract the sub -item value
                const result = source.canister.method.result.runtime;
                if (result === undefined) return result;
                if (result.err !== undefined) return result;
                const { value } = findChildType(
                    source.canister.method.result,
                    source.canister.method.child,
                    result.ok,
                );
                return { ok: value };
            })();
            break;
        case 'light':
            runtimeResult = (() => {
                // Need to extract the sub -item value
                const result = source.light.info.result.runtime;
                if (result === undefined) return result;
                if (result.err !== undefined) return result;
                const { value } = findChildType(
                    source.light.info.result,
                    source.light.info.child,
                    result.ok,
                );
                return { ok: value };
            })();
            break;
        case 'input':
            runtimeResult = source.input.result.runtime;
            break;
        case 'constant':
            runtimeResult = source.constant.result.runtime;
            break;
        case 'inner':
            runtimeResult = source.inner.result.runtime;
            break;
        case 'outer':
            runtimeResult = source.outer.result.runtime;
            break;
    }
    // console.error("using wrapped source runtime", JSON.stringify(runtimeResult));

    // 2. Delete it without value
    if (runtimeResult === undefined) {
        delete source.type.runtime; // Delete the running variable when there are errors
        changed();
        return;
    }

    if (runtimeResult.err !== undefined) {
        // 3.1 Determine if it is wrong, directly assign a value
        source.type.runtime = deepClone(runtimeResult); // Copy
    } else {
        // 3.2 Whether to convert a function
        let value: CandidValue = runtimeResult.ok;
        const transformResult = await doTransform(
            props.initial.transform,
            deepClone(value),
            props.status === 'running',
        ); // Copy
        source.type.runtime = transformResult; // There are errors and passing
    }
    runtimeResult = deepClone(source.type.runtime); // Copy

    // console.error("using wrapped source runtime", source.type.runtime);

    // 4. If the calculation is obtained, it will be triggered
    changed();

    // 5. If there is an export variable
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
        <template v-if="props.initial.source === 'canister'">
            <RunningLightCanisterSourceVue
                :argResult="props.argResult"
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
            />
        </template>
        <template v-else-if="props.initial.source === 'light'">
            <RunningLightLightSourceVue
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
            />
        </template>
        <template v-else-if="props.initial.source === 'input'">
            <RunningLightInputSourceVue
                :argResult="props.argResult"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :outerValues="props.outerValues"
                :initial="props.initial"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            />
        </template>
        <template v-else-if="props.initial.source === 'constant'">
            <RunningLightConstantSourceVue
                :status="props.status"
                :index="props.index"
                :outerValues="props.outerValues"
                :initial="props.initial"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            />
        </template>
        <template v-else-if="props.initial.source === 'inner'">
            <RunningLightInnerSourceVue
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :outerValues="props.outerValues"
                :initial="props.initial"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            />
        </template>
        <template v-else-if="props.initial.source === 'outer'">
            <RunningLightOuterSourceVue
                :argResult="props.argResult"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :outerValues="props.outerValues"
                :initial="props.initial"
                @changed="onDataSourceChanged"
                ref="sourceRef"
            />
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-wrapped-source-content {
    width: 100%;
    > .exported-outer {
        margin-top: 5px;
    }
}
</style>
