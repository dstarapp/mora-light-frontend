<script lang="ts" setup>
import { PropType } from 'vue';
import { RunningStatus } from '../../../../../types/running/running';
import { RunningLight } from '../../../../../types/running/light';
import { TriggerMode } from '../../../../../types/parts/triggers/trigger';
import RunningButtonTriggerModeVue from './modes/RunningLightButtonTriggerMode.vue';
import RunningClockTriggerModeVue from './modes/RunningLightClockTriggerMode.vue';

const props = defineProps({
    parentTriggerRefresh: {
        type: Number,
        required: true,
    },
    parentRunningLight: {
        type: Object as PropType<RunningLight>,
        required: true,
    },
    sourcesRefresh: {
        type: Number,
        required: true,
    },
    callingRefresh: {
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
    calling: {
        type: Number,
        required: true,
    },
    initial: {
        type: Object as PropType<TriggerMode>,
        required: true,
    },
});
</script>

<template>
    <div class="running-wrapped-triggers-content">
        <template v-if="initial.type === 'button'">
            <RunningButtonTriggerModeVue
                :parentTriggerRefresh="props.parentTriggerRefresh"
                :parentRunningLight="props.parentRunningLight"
                :sourcesRefresh="props.sourcesRefresh"
                :callingRefresh="props.callingRefresh"
                :status="props.status"
                :runningLight="props.runningLight"
                :calling="props.calling"
                :initial="(props.initial as any)"
            />
        </template>
        <template v-else-if="initial.type === 'clock'">
            <RunningClockTriggerModeVue
                :parentTriggerRefresh="props.parentTriggerRefresh"
                :parentRunningLight="props.parentRunningLight"
                :sourcesRefresh="props.sourcesRefresh"
                :callingRefresh="props.callingRefresh"
                :status="props.status"
                :runningLight="props.runningLight"
                :calling="props.calling"
                :initial="(props.initial as any)"
            />
        </template>
        <template v-else>
            <template v-if="props.status === 'using'">
                <div class="wrong-type">Unrecognized trigger type {{ (initial as any).type }}</div>
            </template>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-wrapped-triggers-content {
    @apply w-full;
    > .wrong-type {
        @apply w-full h-15 flex justify-center items-center;
    }
}
</style>
