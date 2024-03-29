<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../types/running/running';
import { RunningLight } from '../../../types/running/light';
import { ValueItem } from '../../../types/common/value';
import { DataSourceLight } from '../../../types/parts/sources/light';
import { ArgumentConstraint } from '../../../types/parts/sources/arg';
import {
    hasUIByArgumentConstraintWithUsingStatus,
    hasUIByArgumentConstraint,
} from '../../../types/running/ui';
import { DataResult, deepClone, same, StringResult } from '../../../common';
import { CandidValue } from '../../../types/types/candid';
import RunningArgumentConstraintVue from './common/RunningArgumentConstraint.vue';
import RunningWrappedLightVue from './light/RunningWrappedLight.vue';

const props = defineProps({
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
        required: true, // Need to query the exported internal variables, so what internal variables have been produced before the current node is introduced
    },
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Need to query the exported external variables, so what internal variables have been generated before the current node is introduced
    },
    initial: {
        type: Object as PropType<DataSourceLight>,
        required: true,
    },
});

const SUBSCRIBE_ID = props.runningLight.getNextSubscribeId();

let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.innerValues];
let checkedOuterValues: ValueItem[] = [...props.outerValues];

// The parameter values of the input cut type should be passed in
const argResult = ref<StringResult<CandidValue> | undefined>(undefined);

const argConstraint = ref<ArgumentConstraint>(props.initial.light.arg); // Note that this is the type of cutting

let argConstraintResult: DataResult<ArgumentConstraint> = { ok: argConstraint.value };

let lastArgConstraint: ArgumentConstraint | undefined = undefined; // Prevent multiple calls OK multiple times

const hasContentUI = computed(() => {
    return props.status === 'using'
        ? hasUIByArgumentConstraintWithUsingStatus(argConstraint.value)
        : hasUIByArgumentConstraint(argConstraint.value);
});

const hasControlUI = computed(() => true);

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
    if (props.initial.source !== 'light') return;

    const newCheckedCanExportValues = props.canExportValues;
    const newCheckedInnerValues = [...props.innerValues];
    const newCheckedOuterValues = [...props.outerValues];

    const newArgConstraint = props.initial.light.arg;

    const newArgConstraintResult = { ok: newArgConstraint };

    if (
        initialed &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(argConstraint.value, newArgConstraint) &&
        same(argConstraintResult, newArgConstraintResult)
    ) {
        return;
    }

    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    argConstraint.value = newArgConstraint;

    argConstraintResult = newArgConstraintResult;

    if (props.initial.light.info.extra.runtime !== undefined) {
        // If you have value, set it up
        props.initial.light.info.result.runtime = props.initial.light.info.extra.runtime;
    }

    initialed = true;

    changed();
};

const onArgConstraintChanged = (r: DataResult<ArgumentConstraint>) => {
    argConstraintResult = r;

    // console.error("using light source onArgConstraintChanged", r);

    if (r.err !== undefined) {
        delete props.initial.light.info.result.runtime; // Delete the running variable when there are errors
        lastArgConstraint = undefined;
        changed();
        return;
    }

    argConstraint.value = r.ok;

    // if (same(lastArgConstraint, r.ok)) {
    //     changed();
    //     return; // It seems that there are no many calls
    // }

    lastArgConstraint = deepClone(r.ok); // Copy and record

    argResult.value = deepClone(r.ok.runtime); // You need to inject the cut parameters into the parameter list
};

const onLightControlChanged = (r: StringResult<CandidValue> | undefined) => {
    if (r !== undefined) {
        props.initial.light.info.result.runtime = r;
    } else {
        delete props.initial.light.info.result.runtime;
    }

    changed();
};

const produce = (): DataResult<DataSourceLight> => {
    if (!initialed)
        return { err: { message: `${props.status} light source has not been initial.` } };

    if (argConstraintResult.err !== undefined) return { err: argConstraintResult.err };

    const ok: DataSourceLight = props.initial;

    ok.light.arg = argConstraintResult.ok;

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSourceLight>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-light-source-content">
        <span class="light-name"> Light Call: {{ props.initial.light.info.key }} </span>
        <div
            class="light-content"
            :class="{
                top: props.status !== 'using',
                'margin-bottom': hasContentUI && hasControlUI,
            }"
        >
            <RunningArgumentConstraintVue
                :triggerRefresh="props.triggerRefresh"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :parentSourceId="props.parentSourceId"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :innerValues="props.innerValues"
                :outerValues="props.outerValues"
                :hasLabel="true"
                :initial="argConstraint"
                @changed="onArgConstraintChanged"
            />
        </div>
        <div class="light-control">
            <RunningWrappedLightVue
                :parentGetNextSubscribeId="() => props.runningLight.getNextSubscribeId()"
                :parentTriggerRefresh="props.triggerRefresh"
                :parentRunningLight="props.runningLight"
                :parentSourceId="props.parentSourceId"
                :argResult="argResult"
                :status="props.status"
                :lightKey="props.initial.light.info.key"
                @changed="onLightControlChanged"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-light-source-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    > .light-name {
        margin-bottom: 10px;
        font-size: 12px;
        opacity: 0.5;
    }
    > .light-content {
        margin-top: 5px;
        &.top {
            margin-top: 0;
        }
        &.margin-bottom {
            margin-bottom: 10px;
        }
        width: 100%;
    }
    > .light-control {
        width: 100%;
    }
}
</style>
