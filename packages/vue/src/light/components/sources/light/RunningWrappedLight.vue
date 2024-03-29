<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import { ValueItem } from '../../../../types/common/value';
import { RunningLight } from '../../../../types/running/light';
import { deepClone, same, StringResult } from '../../../../common';
import { CandidValue } from '@mora-light/core/types/candid';
import { LightsRunning, RunningStatus } from '../../../../types/running/running';
import { find } from '../../../../mock/mock';
import RunningLightVue from './RunningLight.vue';

const props = defineProps({
    parentGetNextSubscribeId: {
        type: Function,
        required: true,
    },
    parentTriggerRefresh: {
        type: Number,
        required: true,
    },
    parentRunningLight: {
        type: Object as PropType<RunningLight>,
        required: true,
    },
    parentSourceId: {
        type: Number,
        required: true,
    },
    argResult: {
        type: Object as PropType<StringResult<CandidValue>>,
        required: false,
    },
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    lightKey: {
        type: String,
        required: true,
    },
});

let checkedLightKey = props.lightKey;

const usingRefresh = ref(0);
const using = ref<LightsRunning>(new LightsRunning());
using.value.setParentOuterValues(props.parentRunningLight.finalOuterValue);
const size = ref(using.value.size());

let lightRuntimeResult: StringResult<CandidValue> | undefined = undefined;

const doUsingRefresh = () => {
    size.value = using.value.size();
    usingRefresh.value = usingRefresh.value + 1;
};

watch(
    () => props.parentRunningLight.finalOuterValue,
    (nv) => {
        using.value.setParentOuterValues(nv);
        using.value.setOuterPool(props.parentRunningLight.outerPool);
        doUsingRefresh();
    },
);

let initialed = false;
onBeforeMount(() => init());
watch(
    () => props.lightKey,
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    if (!props.lightKey) return;
    const newCheckedLightKey = props.lightKey;

    if (initialed && same(checkedLightKey, newCheckedLightKey)) {
        return;
    }

    checkedLightKey = newCheckedLightKey;

    reload().then(() => {
        initialed = true;

        changed();
    });
};

// The new key needs to add new plug -in content
const reload = async () => {
    while (using.value.size() > 0) using.value.delete(using.value.size() - 1);
    const light = await find(checkedLightKey);
    using.value.push(checkedLightKey, deepClone(light));
    doUsingRefresh();
};

const onUsingLightChanged = (r: StringResult<CandidValue> | undefined) => {
    lightRuntimeResult = r;
    changed();
};

const produce = (): StringResult<CandidValue> | undefined => {
    return lightRuntimeResult;
};

const emit = defineEmits<{
    changed: [StringResult<CandidValue> | undefined];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-wrapped-light-content">
        <template v-if="size">
            <RunningLightVue
                :parentGetNextSubscribeId="props.parentGetNextSubscribeId"
                :parentTriggerRefresh="props.parentTriggerRefresh"
                :parentRunningLight="props.parentRunningLight"
                :parentSourceId="props.parentSourceId"
                :argResult="props.argResult"
                :status="props.status"
                :usingRefresh="usingRefresh"
                :using="(using as any)"
                :index="0"
                @changed="onUsingLightChanged"
            />
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-wrapped-light-content {
    width: 100%;
}
</style>
